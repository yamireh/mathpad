/**
 * Build-time feature flags.
 *
 * A flag set to `__DEV__` is visible while developing but stays "Coming Soon"
 * in a production build — so `main` keeps shipping cleanly while a feature is
 * being built. Set a flag to `true` to ship the feature (e.g. Clock for V2),
 * or `false` to hide it everywhere.
 */

/** Clock module. Dev-only for now; set to `true` to ship Clock. */
export const CLOCK_ENABLED = __DEV__;
