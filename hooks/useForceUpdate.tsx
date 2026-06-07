import Constants from 'expo-constants';
import { useEffect, useState } from 'react';

import {
  CONFIG_URL,
  isUpdateRequired,
  parseAppConfig,
} from '../lib/appConfig';

/** How long to wait on the config fetch before giving up (offline-safe). */
const FETCH_TIMEOUT_MS = 6000;

export interface UseForceUpdateResult {
  /** True once we KNOW the installed version is below the remote minimum. */
  required: boolean;
  /** App Store numeric id for the deep link, when the config provides one. */
  appStoreId: string | null;
}

/**
 * Best-effort force-update gate. On launch it fetches the remote config and, if
 * the installed app version is below `minVersion`, flips `required` true so the
 * root layout can block the app behind an update screen.
 *
 * Deliberately fail-open: any error (offline, timeout, malformed JSON) leaves
 * `required` false so a child is never locked out by a network hiccup. This is
 * the app's only network call (see SPEC offline exception).
 */
export function useForceUpdate(): UseForceUpdateResult {
  const [required, setRequired] = useState(false);
  const [appStoreId, setAppStoreId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    (async () => {
      try {
        // Cache-bust: RN's fetch doesn't reliably honor `cache: 'no-store'`,
        // and raw.githubusercontent.com sends a ~5-min CDN TTL that iOS's
        // NSURLCache obeys — so without a unique URL the app keeps replaying a
        // stale config and never sees a raised minVersion.
        const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const config = parseAppConfig(await res.json());
        if (cancelled) return;
        const installed = Constants.expoConfig?.version ?? null;
        setAppStoreId(config.appStoreId);
        setRequired(isUpdateRequired(installed, config.minVersion));
      } catch {
        // Offline / timeout / bad JSON — stay fail-open (no forced update).
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return { required, appStoreId };
}
