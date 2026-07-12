/**
 * Family + pairing-code logic (parent side). A signed-in parent owns exactly
 * one family; joining a kid device to it (via the code) is a later, server-side
 * step. See docs/parent-mode-v1.md.
 *
 *   families/{familyId}      { ownerUid, pairingCode, createdAt }
 *   pairingCodes/{code}      { familyId, active }   // code -> family lookup
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from './index';

export interface Family {
  id: string;
  ownerUid: string;
  pairingCode: string;
}

// Unambiguous charset: no 0/O, 1/I/L — easy for a parent to read to a kid.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** A code not already present in the `pairingCodes` lookup. */
async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode();
    const snap = await getDoc(doc(db, 'pairingCodes', code));
    if (!snap.exists()) return code;
  }
  // Collisions are astronomically unlikely at this charset/length; give up.
  return randomCode();
}

export async function getFamilyForOwner(
  ownerUid: string,
): Promise<Family | null> {
  const snap = await getDocs(
    query(
      collection(db, 'families'),
      where('ownerUid', '==', ownerUid),
      limit(1),
    ),
  );
  const found = snap.docs[0];
  if (!found) return null;
  const data = found.data();
  return {
    id: found.id,
    ownerUid: data.ownerUid,
    pairingCode: data.pairingCode,
  };
}

export async function createFamily(ownerUid: string): Promise<Family> {
  const pairingCode = await uniqueCode();
  const ref = await addDoc(collection(db, 'families'), {
    ownerUid,
    pairingCode,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'pairingCodes', pairingCode), {
    familyId: ref.id,
    active: true,
  });
  return { id: ref.id, ownerUid, pairingCode };
}

/** The parent's family, creating it on first sign-in if it doesn't exist. */
export async function ensureFamily(ownerUid: string): Promise<Family> {
  return (await getFamilyForOwner(ownerUid)) ?? createFamily(ownerUid);
}
