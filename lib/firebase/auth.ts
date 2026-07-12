/**
 * Parent email/password auth wrappers over the Firebase SDK, plus friendly
 * error mapping. Screens call these instead of the raw SDK so the surface stays
 * small and swappable.
 */
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth } from './index';

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

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOut() {
  return firebaseSignOut(auth);
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
