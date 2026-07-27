# Parent Pro subscription — status (branch `parent-pro`)

The full state of the Parent Pro subscription work: what's built (all committed +
pushed) and what's still external/pending. Marketing version **2.0.0**.

## Model (locked — see the `pricing` skill §0 / §0.1)
- **All of parent mode is subscription-gated.** Signed-in parent + a family +
  no active sub/trial → the **paywall** instead of the dashboard.
- **Price: $7.99/month, monthly-only** (yearly still open for App Store Connect).
- **Free trial: 3 days** (Apple's minimum; 1 day isn't possible). Configurable via
  the GitHub `mathpad-config/config.json` → `parentProTrialDays` (fallback 3).
- **Kids' modules:** one-time IAP (offline, owned forever) **OR** unlocked by the
  family subscription while active. Free Addition always.
- **5-child hard cap** per family (`MAX_CHILDREN`, `FamilyFullError`).
- **Access architecture:** Apple = payment truth (IAPs + the sub); Firebase =
  identity + family + propagation; the **Cloud Function** bridges them and is the
  only trusted writer of `families/{id}.subscription`. Kids read that flag live.

## Implemented (code complete, committed, pushed; tsc clean, 280 tests)
- **Slice 1 — UX + entitlement:** `ParentProPaywall`, gate in `ParentPanel`
  (paywall vs dashboard; gear hidden when gated), `usePurchases.parentProActive`,
  trial config in `lib/appConfig`, local dev-stub purchase, escape hatch
  ("Continue without Parent Pro" → learner mode), non-parent → sign-in, required
  disclosures (auto-renew + Terms/Privacy), prioritised layout.
- **"See what's included"** tap-through preview (`ParentProDemo`, route
  `app/how-to/parent-pro.tsx`): Progress / Goals / Practice built from the real
  primitives, incl. set-a-goal + create-practice (random/custom, assign to any
  child) snapshots.
- **Slice 2 — real StoreKit** (in `usePurchases`): fetch the `subs` product +
  real price, `requestPurchase` type `subs`, reconcile via
  `hasActiveSubscriptions` (honours expiry, grant-only offline), restore
  (Family-Shared). Falls back to the dev stub when no product (dev).
- **Slice 3 — propagation:** `families/{id}.subscription` field +
  `setFamilySubscription`; parent app mirrors its Pro state (owner-only);
  `useFamilyProActive` (live `onSnapshot`) folds into `owned`/`clockOwned` so an
  active family sub unlocks every module for kids/co-parents. Rules let a linked
  kid read the family doc.
- **Slice 3c — Cloud Function** (`functions/`, compiles clean):
  `syncParentProSubscription` (callable, validates via App Store Server API →
  writes family doc + `subscriptionOwners` map) and `appStoreNotifications`
  (V2 webhook → re-sync on renew/cancel/expire/refund). Client calls it
  best-effort after a purchase. `subscriptionOwners` rule = admin-only.
- **Local StoreKit config** `MathPad.storekit` for simulator testing.

## Dev toggles (for testing without StoreKit)
- Paywall: `DEV: unlock Parent Pro`. Dashboard: `DEV: lock parent mode`.

## PENDING — external, only the user can do (I cannot)
1. **App Store Connect:** create the auto-renewable sub `com.mc.mathpad.parentpro`
   ($7.99/mo, 3-day free trial, **Family Sharing ON**, display name "Parent Pro" +
   description). Paid Apps agreement active. Privacy Policy URL + EULA. Review
   screenshot. → `docs/parent-pro-submission.md`.
2. **Deploy the Cloud Function:** Apple In-App-Purchase key (.p8) → set
   `APPLE_KEY_ID/ISSUER_ID/BUNDLE_ID/ENV` + secret `APPLE_PRIVATE_KEY`,
   `firebase deploy --only functions`, then set the App Store Server Notifications
   **V2** URL (Sandbox + Production). → `functions/README.md`.
3. **Build + test:** `npx expo run:ios` with `MathPad.storekit` (simulator, all
   scenarios) → `docs/parent-pro-local-storekit.md`; then EAS/TestFlight (sandbox).
4. **After the CF is live:** tighten the `families/{id}` rule so clients can't
   write `subscription` (only the admin function), and drop the client mirror in
   `ParentPanel`.
5. **Submit:** the subscription is reviewed **attached to a new app version**
   (the build with the paywall) — not standalone.

## Notes / decisions
- `owned`/`clockOwned` now mean "has access" (IAP OR family sub) — a subscribed
  family sees the one-time buy button hidden. Acceptable; could split later.
- The client mirror is a **stand-in** until the CF is deployed; only the family
  **owner** writes it (co-parents never clobber it).
- Real StoreKit + the Cloud Function are **untested** until the product exists +
  an EAS build / a deploy with Apple keys.

## Docs map
- `pricing` skill §0 / §0.1 — model + entitlement architecture (authoritative).
- `docs/parent-pro-submission.md` — App Store submission checklist + review notes.
- `functions/README.md` — Cloud Function deploy + Apple key + webhook + rule.
- `docs/parent-pro-local-storekit.md` — simulator testing.
