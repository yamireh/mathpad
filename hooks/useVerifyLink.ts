import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { childLinkValid } from '../lib/firebase/family';
import { useAuthUser } from './useAuthUser';
import { useFamilyLink } from './useFamilyLink';

/** Don't re-check more than once per this window (caps Firestore reads). */
const CHECK_THROTTLE_MS = 30 * 60 * 1000;

/**
 * Keeps a child device's "connected" state honest. If the parent removed this
 * child (or deleted the family), the child doc is gone server-side but the local
 * link lingers — so the device still thinks it's connected and would re-sync.
 *
 * On launch and whenever the app returns to the foreground, if we can prove the
 * child is gone, clear the local link (the device shows as not-connected and
 * stops syncing). Uncertainty (offline / auth not ready) never disconnects a
 * valid device. Runs only for the child device itself (uid === childId).
 */
export function useVerifyLink(): void {
  const { link, setLink } = useFamilyLink();
  const { user, initializing } = useAuthUser();
  // Timestamp of the last read — survives effect re-runs so foregrounds don't
  // each cost a Firestore read.
  const lastCheck = useRef(0);

  useEffect(() => {
    if (initializing || !link || !user || user.uid !== link.childId) return;
    let cancelled = false;

    const check = async () => {
      const now = Date.now();
      if (now - lastCheck.current < CHECK_THROTTLE_MS) return; // throttled
      lastCheck.current = now;
      const valid = await childLinkValid(link.familyId, link.childId);
      if (!cancelled && valid === false) setLink(null);
    };

    void check(); // launch (lastCheck is 0, so this always runs)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [initializing, link, user, setLink]);
}
