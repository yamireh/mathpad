/**
 * Parent email/password auth wrappers over the Firebase SDK, plus friendly
 * error mapping. Screens call these instead of the raw SDK so the surface stays
 * small and swappable.
 */
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';

import { deleteParentData } from './family';
import { auth } from './index';

// `updateProfile` mutates the current user in place but does NOT re-fire
// `onAuthStateChanged`, so a fresh displayName wouldn't reach the UI until the
// next launch. This tiny emitter lets useAuthUser re-render on profile edits.
type ProfileListener = () => void;
const profileListeners = new Set<ProfileListener>();

export function onProfileChanged(listener: ProfileListener): () => void {
  profileListeners.add(listener);
  return () => profileListeners.delete(listener);
}

function emitProfileChanged(): void {
  profileListeners.forEach((l) => l());
}

/**
 * Ensure there's a signed-in identity and return its uid — used by the kid
 * device (anonymous, no credentials) before it joins a family. Reuses an
 * existing session if present.
 */
export async function ensureSignedInUid(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

/**
 * True when a real (non-anonymous) parent is signed in on this device. Practice
 * done here is a parent *previewing* ("Open practice mode"), not a kid, so it
 * must not be recorded to history or synced to the dashboard. A real kid device
 * stays anonymous.
 */
export function isSignedInParent(): boolean {
  const u = auth.currentUser;
  return !!u && !u.isAnonymous;
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const displayName = name.trim();
  if (displayName) {
    await updateProfile(cred.user, { displayName });
    emitProfileChanged();
  }
  return cred;
}

/** Update the signed-in parent's display name (used by an existing account). */
export async function updateDisplayName(name: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) return;
  await updateProfile(current, { displayName: name.trim() });
  emitProfileChanged();
}

export function signOut() {
  return firebaseSignOut(auth);
}

/**
 * Permanently delete the signed-in parent's account (Apple Guideline 5.1.1(v)):
 * re-authenticate with the password (Firebase requires a recent login to
 * delete), remove their Firestore data, then delete the auth user itself.
 * `authErrorKey` maps a wrong password to a friendly message.
 */
export async function deleteAccount(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('not-signed-in');
  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
  // Delete Firestore data while still authenticated, then the account.
  await deleteParentData(user.uid);
  await deleteUser(user);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Map a Firebase auth error to an i18n key under `parentAuth.errors.*`, so the
 * UI shows a short, friendly message instead of a raw code.
 */
export function authErrorKey(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  const suffix =
    {
      'auth/invalid-email': 'invalidEmail',
      'auth/missing-password': 'missingPassword',
      'auth/weak-password': 'weakPassword',
      'auth/email-already-in-use': 'emailInUse',
      'auth/invalid-credential': 'badCredentials',
      'auth/wrong-password': 'badCredentials',
      'auth/user-not-found': 'badCredentials',
      'auth/network-request-failed': 'network',
      'auth/too-many-requests': 'tooMany',
    }[code] ?? 'generic';
  return `parentAuth.errors.${suffix}`;
}
