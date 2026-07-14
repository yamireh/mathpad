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

export interface Family {
  id: string;
  ownerUid: string;
  /** Stable code a kid device joins with. */
  pairingCode: string;
  /** Stable code a co-parent joins with. */
  parentCode: string;
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
}

function toFamily(id: string, data: Record<string, unknown>): RawFamily {
  return {
    id,
    ownerUid: data.ownerUid as string,
    pairingCode: data.pairingCode as string,
    parentCode: data.parentCode as string | undefined,
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
    await deleteDoc(child.ref);
  }
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
  // One kid device = one child, keyed by the device's uid.
  await setDoc(
    doc(db, 'families', familyId, 'children', deviceUid),
    { joinedAt: serverTimestamp(), name: name.trim() },
    { merge: true },
  );
  return familyId;
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
