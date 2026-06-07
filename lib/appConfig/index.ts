/**
 * Remote app config — a tiny JSON file the team hosts and can edit at any time
 * without shipping a build. Currently it carries only the force-update gate
 * (minimum supported iOS version); it is the seed of the V1.1 remote-config work.
 *
 * This module is PURE: parsing + version comparison only. The network fetch and
 * the installed-version lookup live in the `useForceUpdate` hook. The app is
 * otherwise fully offline (see SPEC) — this one best-effort GET is the only
 * sanctioned network call, and it never blocks a kid if it fails.
 */

/** Where the remote config lives. Baked into the build; its CONTENTS change. */
export const CONFIG_URL =
  'https://raw.githubusercontent.com/yamireh/mathpad-config/main/config.json';

/** Safe default when the config can't be read — never force an update. */
export const DEFAULT_MIN_VERSION = '0.0.0';

/** The bits of the remote config the app understands today. */
export interface AppConfig {
  /** Installed versions below this must update before using the app. */
  minVersion: string;
  /** Numeric App Store id, for the "Update now" deep link. Null until known. */
  appStoreId: string | null;
}

/**
 * Compare two dot-separated numeric versions (`"1.2.0"`).
 * Returns -1 if `a < b`, 0 if equal, 1 if `a > b`. Missing parts count as 0,
 * and any non-numeric/garbage segment is treated as 0 so a malformed value can
 * never accidentally trigger a force-update.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.');
  const pb = b.split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = Number.parseInt(pa[i] ?? '0', 10) || 0;
    const nb = Number.parseInt(pb[i] ?? '0', 10) || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * Defensively read the iOS block out of the raw fetched JSON. Anything missing
 * or the wrong type falls back to safe values (no forced update).
 */
export function parseAppConfig(raw: unknown): AppConfig {
  const ios =
    raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>).ios
      : undefined;
  const block =
    ios && typeof ios === 'object' ? (ios as Record<string, unknown>) : {};
  const minVersion =
    typeof block.minVersion === 'string' ? block.minVersion : DEFAULT_MIN_VERSION;
  const appStoreId =
    typeof block.appStoreId === 'string' && /^[0-9]+$/.test(block.appStoreId)
      ? block.appStoreId
      : null;
  return { minVersion, appStoreId };
}

/** True only when we know the installed version AND it's below the minimum. */
export function isUpdateRequired(
  installed: string | null,
  minVersion: string,
): boolean {
  if (!installed) return false;
  return compareVersions(installed, minVersion) < 0;
}

/**
 * App Store page URL for the "Update now" button. The placeholder id (set
 * before the first submission) yields null so we don't deep-link to a 404.
 */
export function appStoreUrl(appStoreId: string | null): string | null {
  if (!appStoreId || appStoreId === '0000000000') return null;
  return `https://apps.apple.com/app/id${appStoreId}`;
}
