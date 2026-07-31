/**
 * Family, membership, and pairing/invite logic. A family has one creator
 * (`ownerUid`) plus any number of equal co-parents; kid devices link in by a
 * pairing code, co-parents by an invite code. See docs/parent-mode-v1.md.
 *
 *   families/{familyId}                      { ownerUid, pairingCode, createdAt }
 *   families/{familyId}/parents/{parentUid}  { joinedAt }          // members (equal)
 *   families/{familyId}/children/{childId}   { name, joinedAt, <summary> }
 *   pairingCodes/{code}                      { familyId, active }  // kid device join
 *   parentInvites/{code}                     { familyId, active }  // co-parent join
 *   parentIndex/{parentUid}                  { familyId }          // "my family" pointer
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
  where,
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
  /** Stable code a kid device joins with. */
  pairingCode: string;
  /** Stable code a co-parent joins with. */
  parentCode: string;
  /** Parent Pro subscription mirror (absent = never subscribed). */
  subscription?: FamilySubscription;
}

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

/** A code not already present in the given lookup collection. */
async function uniqueCode(
  lookup: 'pairingCodes' | 'parentInvites',
): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode();
    const snap = await getDoc(doc(db, lookup, code));
    if (!snap.exists()) return code;
  }
  // Collisions are astronomically unlikely at this charset/length; give up.
  return randomCode();
}

interface RawFamily {
  id: string;
  ownerUid: string;
  pairingCode: string;
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
    pairingCode: data.pairingCode as string,
    parentCode: data.parentCode as string | undefined,
    subscription: parseSubscription(data.subscription),
  };
}

/**
 * Guarantee the family has a stable co-parent code (backfills families created
 * before co-parents existed). Like the pairing code: minted once, then reused.
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
    const fam = await getDoc(doc(db, 'families', pointedId));
    if (fam.exists()) return ensureParentCode(toFamily(fam.id, fam.data()));
  }
  const owned = await getFamilyForOwner(uid);
  if (owned) {
    await linkParent(owned.id, uid);
    return ensureParentCode(owned);
  }
  return null;
}

/** Create a brand-new family owned by this parent. */
export async function createFamily(ownerUid: string): Promise<Family> {
  const pairingCode = await uniqueCode('pairingCodes');
  const parentCode = await uniqueCode('parentInvites');
  const ref = await addDoc(collection(db, 'families'), {
    ownerUid,
    pairingCode,
    parentCode,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'pairingCodes', pairingCode), {
    familyId: ref.id,
    active: true,
  });
  await setDoc(doc(db, 'parentInvites', parentCode), {
    familyId: ref.id,
    active: true,
  });
  await linkParent(ref.id, ownerUid);
  return { id: ref.id, ownerUid, pairingCode, parentCode };
}

/**
 * Max children per family. A hard cap that keeps a subscription (which unlocks
 * every module for the whole family) scoped to a real household, not a shared
 * account handed round to friends. See the `pricing` skill.
 */
export const MAX_CHILDREN = 5;

/** Thrown when a family already has {@link MAX_CHILDREN} children. */
export class FamilyFullError extends Error {
  constructor() {
    super('family-full');
    this.name = 'FamilyFullError';
  }
}

/** Current number of children in the family. */
export async function countChildren(familyId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'families', familyId, 'children'));
  return snap.size;
}

/**
 * Create a child profile in the family (Parent Pro Phase 1). A child is a family
 * entity with a stable generated id — NOT tied to any login — so a parent can
 * practice as them on a shared device, and dedicated kid tablets claim one later.
 * Authorized because the creator is a family member. Returns the new child id.
 * Throws {@link FamilyFullError} once the family is at the cap.
 */
export async function createChildProfile(
  familyId: string,
  name: string,
): Promise<string> {
  if ((await countChildren(familyId)) >= MAX_CHILDREN) throw new FamilyFullError();
  const ref = await addDoc(collection(db, 'families', familyId, 'children'), {
    name: name.trim(),
    joinedAt: serverTimestamp(),
  });
  return ref.id;
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

/** Update a linked child's display name (the device edits its own child doc). */
export async function updateChildName(
  familyId: string,
  childId: string,
  name: string,
): Promise<void> {
  await setDoc(
    doc(db, 'families', familyId, 'children', childId),
    { name: name.trim() },
    { merge: true },
  );
}

/** Thrown when a pairing/invite code doesn't resolve to an active family. */
export class InvalidCodeError extends Error {
  constructor() {
    super('invalid-code');
    this.name = 'InvalidCodeError';
  }
}

/**
 * Whether this device's linked child still exists in its family. Returns `false`
 * ONLY when we can definitively see it's gone (the parent removed the child or
 * deleted the family); `null` for any uncertainty (offline, permission, or the
 * signed-in identity isn't this child) so a transient hiccup never disconnects a
 * still-valid device.
 */
export async function childLinkValid(
  familyId: string,
  childId: string,
): Promise<boolean | null> {
  try {
    if (auth.currentUser?.uid !== childId) return null;
    const snap = await getDoc(
      doc(db, 'families', familyId, 'children', childId),
    );
    return snap.exists();
  } catch {
    return null;
  }
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
  await deleteDoc(doc(db, 'pairingCodes', fam.pairingCode)).catch(() => {});
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
  lookup: 'pairingCodes' | 'parentInvites',
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
 * Link a (kid) device to a family by pairing code. Returns the family id.
 * Throws {@link InvalidCodeError} for a bad/inactive code.
 */
export async function joinFamily(
  code: string,
  deviceUid: string,
  name: string,
): Promise<string> {
  const familyId = await resolveCode('pairingCodes', code);
  // One kid device = one child, keyed by the device's uid; setDoc(merge) covers
  // both a first join and a re-join. We canNOT count children here to enforce
  // the cap: a joining kid isn't a family member yet, and the security rules
  // forbid a non-member from LISTing the children collection (that list threw
  // permission-denied and blocked every code-join). The 5-child cap is enforced
  // parent-side in createChildProfile; a server-authoritative cap for code
  // joins is a TODO (Cloud Function joinFamily).
  await setDoc(
    doc(db, 'families', familyId, 'children', deviceUid),
    { joinedAt: serverTimestamp(), name: name.trim() },
    { merge: true },
  );
  return familyId;
}

/**
 * Leave a family from a kid device: remove this device's child record so the
 * parent dashboard reflects only currently-linked kids. The security rules let
 * a kid delete its OWN child doc and sessions (uid == childId); it can't touch
 * parent-authoritative data (goals/stars), which is keyed under the same child
 * path and never surfaces as a phantom child. Best-effort — a failed cleanup
 * must not block the local unlink (the caller clears the link regardless).
 */
export async function leaveFamily(
  familyId: string,
  childId: string,
): Promise<void> {
  // Remove the device's own practice sessions first (keeps storage tidy), then
  // delete the child doc itself — the doc is what the dashboard lists.
  try {
    const sessions = await getDocs(
      collection(db, 'families', familyId, 'children', childId, 'sessions'),
    );
    await Promise.all(
      sessions.docs.map((d) => deleteDoc(d.ref).catch(() => {})),
    );
  } catch {
    // Ignore: the child-doc delete below is what matters for the dashboard.
  }
  await deleteDoc(doc(db, 'families', familyId, 'children', childId));
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
