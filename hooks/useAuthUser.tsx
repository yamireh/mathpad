import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { auth } from '../lib/firebase';

export interface AuthUserState {
  /** The signed-in Firebase user, or null. Anonymous users have `isAnonymous`. */
  user: User | null;
  /** True until the first auth state resolves — gate UI on this to avoid flicker. */
  initializing: boolean;
}

/**
 * Subscribes to Firebase auth state. Drives the parent area: signed-out shows
 * sign-in, signed-in shows the dashboard. (The kid device signs in anonymously
 * for its family link — a separate flow.)
 */
export function useAuthUser(): AuthUserState {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setInitializing(false);
    });
  }, []);

  return { user, initializing };
}
