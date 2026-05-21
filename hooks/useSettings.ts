/**
 * useSettings — load and persist the Settings for one operation.
 *
 * Loads the last-used settings (or defaults) on mount; every update is saved
 * back so the choice is restored on the next visit (SPEC § Settings).
 */
import { useCallback, useEffect, useState } from 'react';

import { settingsStore } from '../lib/storage';
import type { Operation, Settings } from '../types';

export interface UseSettingsResult {
  /** Current settings, or null while loading. */
  settings: Settings | null;
  /** Replace the settings and persist them. */
  update: (next: Settings) => void;
}

export function useSettings(operation: Operation): UseSettingsResult {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    setSettings(null);
    settingsStore.getOrDefault(operation).then((loaded) => {
      if (active) setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, [operation]);

  const update = useCallback((next: Settings) => {
    setSettings(next);
    void settingsStore.save(next);
  }, []);

  return { settings, update };
}
