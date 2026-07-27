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

/** Default cap on recent sessions the parent dashboard loads per child. */
export const DEFAULT_MAX_HISTORY = 50;
/** Upper guard so a bad remote value can't trigger a huge read. */
const MAX_HISTORY_CEILING = 500;

/**
 * Free-trial length (days) for the Parent Pro subscription. Remotely tunable.
 * Default 3 — Apple's shortest supported free-trial intro offer (1 day isn't
 * available in App Store Connect), so the displayed trial matches the product.
 */
export const DEFAULT_PARENT_PRO_TRIAL_DAYS = 3;
/** Guard so a bad remote value can't grant an absurd trial. */
const PARENT_PRO_TRIAL_CEILING = 90;

/** The bits of the remote config the app understands today. */
export interface AppConfig {
  /** Installed versions below this must update before using the app. */
  minVersion: string;
  /** Numeric App Store id, for the "Update now" deep link. Null until known. */
  appStoreId: string | null;
  /** Recent sessions per child the dashboard loads (remotely tunable). */
  maxHistorySessionsPerChild: number;
  /** Parent Pro free-trial length in days (0 = no trial). Fallback 3. */
  parentProTrialDays: number;
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
  // Top-level (not iOS-specific) tunable; clamped to a sane range so garbage
  // can't blow up dashboard reads.
  const top =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawMax = top.maxHistorySessionsPerChild;
  const maxHistorySessionsPerChild =
    typeof rawMax === 'number' && Number.isFinite(rawMax) && rawMax >= 1
      ? Math.min(MAX_HISTORY_CEILING, Math.floor(rawMax))
      : DEFAULT_MAX_HISTORY;
  // Trial days: 0 disables the trial; anything invalid falls back to the default.
  const rawTrial = top.parentProTrialDays;
  const parentProTrialDays =
    typeof rawTrial === 'number' && Number.isFinite(rawTrial) && rawTrial >= 0
      ? Math.min(PARENT_PRO_TRIAL_CEILING, Math.floor(rawTrial))
      : DEFAULT_PARENT_PRO_TRIAL_DAYS;
  return {
    minVersion,
    appStoreId,
    maxHistorySessionsPerChild,
    parentProTrialDays,
  };
}

// Runtime config cache — the launch fetch (useForceUpdate) applies the parsed
// config here so non-React code (e.g. dashboard reads) can use remotely-tuned
// values. Fail-safe defaults until (and if) the fetch resolves; parseAppConfig
// itself stays pure.
let runtimeConfig: AppConfig = {
  minVersion: DEFAULT_MIN_VERSION,
  appStoreId: null,
  maxHistorySessionsPerChild: DEFAULT_MAX_HISTORY,
  parentProTrialDays: DEFAULT_PARENT_PRO_TRIAL_DAYS,
};

/** Parent Pro trial length (days) from the remote config, fallback 1. */
export function parentProTrialDays(): number {
  return runtimeConfig.parentProTrialDays;
}

/** Publish the freshly-fetched config for the rest of the app to read. */
export function applyRuntimeConfig(config: AppConfig): void {
  runtimeConfig = config;
}

/** The current runtime config (remote if fetched, else safe defaults). */
export function getRuntimeConfig(): AppConfig {
  return runtimeConfig;
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

/** Google Play product page URL for an app's package id. */
export function playStoreUrl(packageId: string): string {
  return `https://play.google.com/store/apps/details?id=${packageId}`;
}

/**
 * Ordered "Update now" links to try for the running platform. The caller opens
 * each in turn until one succeeds: the store-app deep link first (jumps
 * straight to this app in the App Store / Play Store), then the https page as a
 * universal fallback (store app if present, else browser).
 *
 * Android needs no remote id — the package id identifies the listing. iOS needs
 * the numeric App Store id from the remote config; without it we can only reach
 * the store front, so set `ios.appStoreId` in the config for a direct link.
 */
export function storeUpdateUrls(
  platform: 'ios' | 'android',
  opts: { appStoreId: string | null; packageId: string },
): string[] {
  if (platform === 'android') {
    return [`market://details?id=${opts.packageId}`, playStoreUrl(opts.packageId)];
  }
  const web = appStoreUrl(opts.appStoreId);
  if (web) return [web.replace('https://', 'itms-apps://'), web];
  // No id configured yet — last resort so the button still opens the store.
  return ['itms-apps://apps.apple.com', 'https://apps.apple.com'];
}
