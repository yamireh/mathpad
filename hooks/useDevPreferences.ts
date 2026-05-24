/**
 * Hook for reading + updating developer / QA preferences (the bits hidden
 * from the kid's normal Settings screen — e.g. the auto-solve button).
 *
 * Mirrors the simple lazy-load pattern used in `useSettings`: load once on
 * mount, expose an `update` that persists immediately, and surface
 * `loaded` so callers can distinguish "still loading" from "real defaults".
 */
import { useCallback, useEffect, useState } from 'react';

import {
  defaultDevPreferences,
  devPreferencesStore,
  type DevPreferences,
} from '../lib/storage';

export function useDevPreferences() {
  const [prefs, setPrefs] = useState<DevPreferences>(defaultDevPreferences);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    devPreferencesStore.get().then((value) => {
      if (!cancelled) {
        setPrefs(value);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<DevPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      void devPreferencesStore.save(next);
      return next;
    });
  }, []);

  return { prefs, loaded, update };
}
