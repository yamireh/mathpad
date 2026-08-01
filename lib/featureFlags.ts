/**
 * Build-time feature flags.
 *
 * A flag set to `__DEV__` is visible while developing but stays "Coming Soon"
 * in a production build — so `main` keeps shipping cleanly while a feature is
 * being built. Set a flag to `true` to ship the feature (e.g. Clock for V2),
 * or `false` to hide it everywhere.
 */

/**
 * Clock module. Temporarily held back to "Coming Soon" in production
 * (`__DEV__`) while its modes are still being designed — so Operations + Parent
 * mode can ship polished first. Stays fully usable in dev builds. Flip back to
 * `true` to re-ship it. (Paid Clock IAP `com.mc.mathpad.clock`.)
 */
export const CLOCK_ENABLED = __DEV__;

/**
 * The "Unlock everything" Complete bundle ($24.99). Deferred until enough
 * modules exist to make it worthwhile (and to satisfy App Store rules about
 * selling available content) — see the `pricing` / `versions` skills. Flip to
 * `true` once Shapes/Money/Axis ship; the buttons appear on every unlock page.
 */
export const COMPLETE_BUNDLE_ENABLED = false;

/**
 * Parent Pro — the subscription-gated parent experience (progress/goals/practice
 * tabs, targets & stars, assigned exams) plus the paywall. Built dark on the
 * `parent-pro` branch (`__DEV__`) while the StoreKit wiring + design came
 * together; now LIVE (2.0.x) — the subscription is wired, the Cloud Function is
 * deployed, and the flow is tested. See `docs/parent-pro.md`.
 */
export const PARENT_PRO_ENABLED = true;
