import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flushPending } from '../lib/firebase/sync';

/**
 * Drains the offline session-sync queue: once on launch, and again whenever the
 * app returns to the foreground (a cheap proxy for "connectivity may be back,"
 * with no extra native dependency). Each finished session also flushes itself,
 * so this mainly catches sessions that were queued while offline.
 */
export function useSyncFlush(): void {
  useEffect(() => {
    void flushPending();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushPending();
    });
    return () => sub.remove();
  }, []);
}
