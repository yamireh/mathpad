/**
 * Build-time feature flags.
 *
 * A flag set to `__DEV__` is visible while developing but stays "Coming Soon"
 * in a production build — so `main` keeps shipping cleanly while a feature is
 * being built. Set a flag to `true` to ship the feature (e.g. Clock for V2),
 * or `false` to hide it everywhere.
 */

/** Clock module — live (V1.2, paid Clock IAP `com.mc.mathpad.clock`). */
export const CLOCK_ENABLED = true;

/**
 * The "Unlock everything" Complete bundle ($24.99). Deferred until enough
 * modules exist to make it worthwhile (and to satisfy App Store rules about
 * selling available content) — see the `pricing` / `versions` skills. Flip to
 * `true` once Shapes/Money/Axis ship; the buttons appear on every unlock page.
 */
export const COMPLETE_BUNDLE_ENABLED = false;
