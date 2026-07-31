/**
 * Family, membership, and pairing/invite logic. A family has one creator
 * (`ownerUid`) plus any number of equal co-parents; kid devices link in by
 * claiming one of a fixed pool of per-child slot codes, co-parents by an invite
 * code. See docs/parent-pro-family-slots.md.
 *
 *   families/{familyId}                      { ownerUid, parentCode, subscription?, createdAt }
 *   families/{familyId}/parents/{parentUid}  { joinedAt }                    // members (equal)
 *   families/{familyId}/children/{childId}   { name, status, deviceUid, code, joinedAt }
 *   pairingCodes/{code}                      { familyId, childId, status }   // kid slot codes
 *   parentInvites/{code}                     { familyId, active }            // co-parent join
 *   parentIndex/{parentUid}                  { familyId }                    // "my family" pointer
 *   childDevices/{deviceUid}                 { familyId, childId }           // kid reverse index
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from './index';
import { purgeChildExamResults } from './exams';
import { purgeChildRewards } from './rewards';

/**
 * The family's Parent Pro subscription state — the single source of truth every
 * device reads (parent gate + kid module access). In production it's written
 * ONLY by the receipt-validating Cloud Function (see the `pricing` skill §0.1);
 * today the parent app mirrors its local Pro state here as a stand-in.
 */
export interface FamilySubscription {
  active: boolean;
  /** ISO expiry — access holds until then even after cancel. Null if unknown. */
  expiresAt: string | null;
}

export interface Family {
  id: string;
  ownerUid: string;
  /** Stable code a co-parent joins with. */
  parentCode: string;
  /** Parent Pro subscription mirror (absent = never subscribed). */
  subscription?: FamilySubscription;
}

/** How many child slots a family is born with (structural cap). */
export const SLOT_COUNT = 5;

// Unambiguous charset: no 0/O, 1/I/L — easy for a parent to read aloud.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** A code not already present in the given lookup collection nor in `taken`. */
async function uniqueCode(
  lookup: 'pairingCodes' | 'parentInvites',
  taken: Set<string> = new Set(),
): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode();
    if (taken.has(code)) continue;
    const snap = await getDoc(doc(db, lookup, code));
    if (!snap.exists()) return code;
  }
  // Collisions are astronomically unlikely at this charset/length; give up.
  return randomCode();
}

interface RawFamily {
  id: string;
  ownerUid: string;
  parentCode?: string;
  subscription?: FamilySubscription;
}

/** Defensively read the subscription block off a family doc. */
function parseSubscription(raw: unknown): FamilySubscription | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  return {
    active: s.active === true,
    expiresAt: typeof s.expiresAt === 'string' ? s.expiresAt : null,
  };
}

function toFamily(id: string, data: Record<string, unknown>): RawFamily {
  return {
    id,
    ownerUid: data.ownerUid as string,
    parentCode: data.parentCode as string | undefined,
    subscription: parseSubscription(data.subscription),
  };
}

/**
 * Guarantee the family has a stable co-parent code (backfills families created
 * before co-parents existed). Minted once, then reused.
 */
async function ensureParentCode(fam: RawFamily): Promise<Family> {
  if (fam.parentCode) return fam as Family;
  const parentCode = await uniqueCode('parentInvites');
  await setDoc(doc(db, 'parentInvites', parentCode), {
    familyId: fam.id,
    active: true,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'families', fam.id), { parentCode }, { merge: true });
  return { ...fam, parentCode };
}

async function getFamilyForOwner(ownerUid: string): Promise<RawFamily | null> {
  const snap = await getDocs(
    query(
      collection(db, 'families'),
      where('ownerUid', '==', ownerUid),
      limit(1),
    ),
  );
  const found = snap.docs[0];
  return found ? toFamily(found.id, found.data()) : null;
}

/** Record a parent's membership + "my family" pointer (idempotent). */
async function linkParent(familyId: string, parentUid: string): Promise<void> {
  await setDoc(
    doc(db, 'families', familyId, 'parents', parentUid),
    { joinedAt: serverTimestamp() },
    { merge: true },
  );
  await setDoc(
    doc(db, 'parentIndex', parentUid),
    { familyId },
    { merge: true },
  );
}

/**
 * The family this parent belongs to (as creator OR co-parent), or `null` if
 * they haven't set one up yet. Reads the O(1) pointer first; falls back to the
 * owner query (for a creator from before pointers existed) and backfills it.
 */
export async function getFamilyForParent(uid: string): Promise<Family | null> {
  const ptr = await getDoc(doc(db, 'parentIndex', uid));
  const pointedId = ptr.exists()
    ? (ptr.data()?.familyId as string | undefined)
    : undefined;
  if (pointedId) {
    try {
      const fam = await getDoc(doc(db, 'families', pointedId));
      if (fam.exists()) return ensureParentCode(toFamily(fam.id, fam.data()));
    } catch {
      // Dangling pointer to a family that no longer exists (owner deleted it, or
      // a manual cleanup): reading a missing family is rule-denied, which would
      // throw. Fall through to the owner query / create flow instead of erroring.
    }
  }
  const owned = await getFamilyForOwner(uid);
  if (owned) {
    await linkParent(owned.id, uid);
    return ensureParentCode(owned);
  }
  return null;
}

/**
 * Create a brand-new family owned by this parent. Mints the fixed pool of
 * {@link SLOT_COUNT} `free` pairing codes (the child slots) + the co-parent
 * invite code. The family doc is written FIRST so the pairingCodes create rule
 * can read the family's ownerUid.
 */
export async function createFamily(ownerUid: string): Promise<Family> {
  const ref = await addDoc(collection(db, 'families'), {
    ownerUid,
    createdAt: serverTimestamp(),
  });

  // Mint N distinct free slot codes + the co-parent invite in one batch.
  const taken = new Set<string>();
  const slotCodes: string[] = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    const code = await uniqueCode('pairingCodes', taken);
    taken.add(code);
    slotCodes.push(code);
  }
  const parentCode = await uniqueCode('parentInvites');

  const batch = writeBatch(db);
  for (const code of slotCodes) {
    batch.set(doc(db, 'pairingCodes', code), {
      familyId: ref.id,
      childId: null,
      status: 'free',
    });
  }
  batch.set(doc(db, 'parentInvites', parentCode), {
    familyId: ref.id,
    active: true,
  });
  batch.set(doc(db, 'families', ref.id), { parentCode }, { merge: true });
  await batch.commit();

  await linkParent(ref.id, ownerUid);
  return { id: ref.id, ownerUid, parentCode };
}

/** Thrown when a family has no free slot left (all {@link SLOT_COUNT} used). */
export class FamilyFullError extends Error {
  constructor() {
    super('family-full');
    this.name = 'FamilyFullError';
  }
}

/** Thrown when a pairing/invite code doesn't resolve to an active family. */
export class InvalidCodeError extends Error {
  constructor() {
    super('invalid-code');
    this.name = 'InvalidCodeError';
  }
}

/** Thrown when a slot code has already been claimed by another device. */
export class CodeInUseError extends Error {
  constructor() {
    super('code-in-use');
    this.name = 'CodeInUseError';
  }
}

/**
 * Assign a free slot to a new named child (parent action). Finds a `free`
 * pairing code, creates the child doc (status `pending`, no device yet) and
 * marks the code `assigned` — atomically. Returns the stable child (slot) id and
 * the code the parent shares with the child's device.
 * Throws {@link FamilyFullError} when every slot is taken.
 */
export async function addChild(
  familyId: string,
  name: string,
): Promise<{ childId: string; code: string }> {
  const free = await getDocs(
    query(
      collection(db, 'pairingCodes'),
      where('familyId', '==', familyId),
      where('status', '==', 'free'),
      limit(1),
    ),
  );
  const codeDoc = free.docs[0];
  if (!codeDoc) throw new FamilyFullError();
  const code = codeDoc.id;
  const childRef = doc(collection(db, 'families', familyId, 'children'));

  const batch = writeBatch(db);
  batch.set(childRef, {
    name: name.trim(),
    status: 'pending',
    deviceUid: null,
    code,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'pairingCodes', code), {
    childId: childRef.id,
    status: 'assigned',
  });
  await batch.commit();

  return { childId: childRef.id, code };
}

/**
 * Claim a slot from a (kid) device by its code — the single-use join. Resolves
 * the code to its child slot; if that slot is already `linked` to a DIFFERENT
 * device, throws {@link CodeInUseError}. If it's already linked to THIS device
 * the call is idempotent. Otherwise flips the child to `linked`, stamps this
 * device's uid, and writes the reverse `childDevices` pointer. Returns the
 * family + child ids and the parent-set name (to seed the local display name).
 * Throws {@link InvalidCodeError} for a bad/unassigned code.
 */
export async function claimSlot(
  code: string,
  deviceUid: string,
): Promise<{ familyId: string; childId: string; name: string }> {
  const normalized = code.trim().toUpperCase();
  const codeSnap = await getDoc(doc(db, 'pairingCodes', normalized));
  const codeData = codeSnap.data();
  if (!codeSnap.exists() || !codeData?.familyId || !codeData?.childId) {
    throw new InvalidCodeError();
  }
  const familyId = codeData.familyId as string;
  const childId = codeData.childId as string;

  const childRef = doc(db, 'families', familyId, 'children', childId);
  const childSnap = await getDoc(childRef);
  const child = childSnap.data();
  if (!childSnap.exists() || !child) throw new InvalidCodeError();
  const name = (child.name as string | undefined) ?? '';

  if (child.status === 'linked') {
    // Already claimed: fine if it's this device, otherwise locked.
    if (child.deviceUid === deviceUid) return { familyId, childId, name };
    throw new CodeInUseError();
  }

  // CLAIM (single-use): pending -> linked, stamping this device's uid. Name is
  // left untouched (the claim rule requires it unchanged).
  await updateDoc(childRef, { status: 'linked', deviceUid });
  await setDoc(doc(db, 'childDevices', deviceUid), { familyId, childId });
  return { familyId, childId, name };
}

/**
 * Re-issue a child's slot (parent action, e.g. lost / reinstalled device):
 * revert to `pending` and clear the device so the same child can rejoin with the
 * same code — its history (same childId) is preserved. The old device
 * auto-unlinks on its next launch (see useVerifyLink).
 */
export async function reissueChild(
  familyId: string,
  childId: string,
): Promise<void> {
  await updateDoc(doc(db, 'families', familyId, 'children', childId), {
    status: 'pending',
    deviceUid: null,
  });
}

/** Rename a child from the dashboard (parent action — a member write). */
export async function renameChild(
  familyId: string,
  childId: string,
  name: string,
): Promise<void> {
  await updateDoc(doc(db, 'families', familyId, 'children', childId), {
    name: name.trim(),
  });
}

/**
 * Remove a child entirely (parent action): delete its sessions + parent-owned
 * subcollections + the child doc, and return its code to the `free` pool so the
 * slot can be reused. Any family member may do this.
 */
export async function removeChild(
  familyId: string,
  childId: string,
): Promise<void> {
  const childRef = doc(db, 'families', familyId, 'children', childId);
  const childSnap = await getDoc(childRef);
  const code = childSnap.data()?.code as string | undefined;

  const sessions = await getDocs(collection(childRef, 'sessions'));
  await Promise.all(sessions.docs.map((d) => deleteDoc(d.ref)));
  await purgeChildRewards(childRef); // targets / stars / awards / redemptions
  await purgeChildExamResults(childRef); // submitted exam results
  await deleteDoc(childRef);

  // Free the slot for reuse (best-effort; a stale code is harmless).
  if (code) {
    await setDoc(
      doc(db, 'pairingCodes', code),
      { childId: null, status: 'free' },
      { merge: true },
    ).catch(() => {});
  }
}

/**
 * Write the family's Parent Pro subscription mirror. Production: the Cloud
 * Function owns this (from Apple's validated receipt). Today: the parent app
 * calls it to reflect its local Pro state so co-parents + kid devices inherit.
 */
export async function setFamilySubscription(
  familyId: string,
  subscription: FamilySubscription,
): Promise<void> {
  await setDoc(
    doc(db, 'families', familyId),
    { subscription },
    { merge: true },
  );
}

/**
 * Whether this device's linked child slot is still valid for THIS device.
 * Returns `false` only when we can definitively see it's no longer ours (the
 * child was removed, re-issued, or taken over by another device); `null` for any
 * uncertainty (offline, permission, no uid) so a transient hiccup never
 * disconnects a still-valid device.
 */
export async function childLinkValid(
  familyId: string,
  childId: string,
): Promise<boolean | null> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const snap = await getDoc(
      doc(db, 'families', familyId, 'children', childId),
    );
    if (!snap.exists()) return false; // removed
    const data = snap.data();
    return data.status === 'linked' && data.deviceUid === uid;
  } catch {
    return null;
  }
}

/** Best-effort delete this device's reverse pointer after it unlinks. */
export async function deleteChildDevice(deviceUid: string): Promise<void> {
  await deleteDoc(doc(db, 'childDevices', deviceUid)).catch(() => {});
}

/** Delete a whole family: children + sessions, memberships, codes, family doc. */
async function deleteFamily(fam: Family): Promise<void> {
  const famRef = doc(db, 'families', fam.id);
  const children = await getDocs(collection(famRef, 'children'));
  for (const child of children.docs) {
    const sessions = await getDocs(collection(child.ref, 'sessions'));
    await Promise.all(sessions.docs.map((d) => deleteDoc(d.ref)));
    await purgeChildRewards(child.ref); // targets / stars / awards / redemptions
    await purgeChildExamResults(child.ref); // submitted exam results
    await deleteDoc(child.ref);
  }
  // Family-level exams (authored by the parent) go too.
  const exams = await getDocs(collection(famRef, 'exams'));
  await Promise.all(exams.docs.map((d) => deleteDoc(d.ref)));
  const parents = await getDocs(collection(famRef, 'parents'));
  await Promise.all(parents.docs.map((d) => deleteDoc(d.ref)));
  // Codes must go before the family doc (their delete rule reads the family).
  const codes = await getDocs(
    query(collection(db, 'pairingCodes'), where('familyId', '==', fam.id)),
  );
  await Promise.all(codes.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
  await deleteDoc(doc(db, 'parentInvites', fam.parentCode)).catch(() => {});
  await deleteDoc(famRef);
}

/**
 * Delete a parent's data ahead of deleting their auth account: the whole family
 * if they own it, otherwise just their own co-parent membership. Always drops
 * their "my family" pointer. Call while still authenticated (rules need it).
 */
export async function deleteParentData(uid: string): Promise<void> {
  const fam = await getFamilyForParent(uid);
  if (fam) {
    if (fam.ownerUid === uid) {
      await deleteFamily(fam);
    } else {
      await deleteDoc(doc(db, 'families', fam.id, 'parents', uid));
    }
  }
  await deleteDoc(doc(db, 'parentIndex', uid)).catch(() => {});
}

async function resolveCode(
  lookup: 'parentInvites',
  code: string,
): Promise<string> {
  const normalized = code.trim().toUpperCase();
  const snap = await getDoc(doc(db, lookup, normalized));
  const data = snap.data();
  if (!snap.exists() || !data || data.active === false || !data.familyId) {
    throw new InvalidCodeError();
  }
  return data.familyId as string;
}

/**
 * Join an existing family as an equal co-parent via an invite code. Returns the
 * family id. The membership doc carries the code so the security rule can
 * verify possession. Throws {@link InvalidCodeError} for a bad/inactive code.
 */
export async function joinAsParent(code: string, uid: string): Promise<string> {
  const normalized = code.trim().toUpperCase();
  const familyId = await resolveCode('parentInvites', normalized);
  await setDoc(
    doc(db, 'families', familyId, 'parents', uid),
    { joinedAt: serverTimestamp(), invite: normalized },
    { merge: true },
  );
  await setDoc(doc(db, 'parentIndex', uid), { familyId }, { merge: true });
  return familyId;
}
