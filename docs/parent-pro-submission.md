# Parent Pro subscription — App Store submission checklist

The Parent Pro auto-renewable subscription (`com.mc.mathpad.parentpro`, $7.99/mo,
3-day free trial). A first-time subscription is **reviewed attached to a new app
version** — it can't be reviewed standalone, so a build containing the paywall
must be uploaded and the subscription attached to that version's submission.

## 1. Business setup
- [ ] **Paid Applications Agreement** active (banking + tax). Without it the
      subscription can't be reviewed or purchased, even in sandbox.

## 2. Subscription product (App Store Connect → Monetization → Subscriptions)
- [ ] Subscription Group created (e.g. "Parent Pro").
- [ ] Subscription: **Product ID `com.mc.mathpad.parentpro`**, duration **1 month**.
- [ ] **Price: $7.99** (US) → let Apple auto-fill other regions.
- [ ] **Introductory Offer → Free, 3 days** (Apple's shortest; 1 day isn't
      available — the app already shows a 3-day trial).
- [ ] **Family Sharing: ON**.
- [ ] Localization: **Display Name "Parent Pro"** + **Description**
      ("The full family experience: progress, goals, practice.").
- [ ] **Review screenshot** of the paywall.
- [ ] **Review notes** (below) + a working **test parent account**.

## 3. App-level metadata (required for subscriptions)
- [ ] **Privacy Policy URL** set in *App Information* (the app hosts one at
      microclouds.ca/mathpad-privacy — matches the paywall's Privacy link).
- [ ] **License Agreement**: Apple's standard EULA is fine (matches the paywall's
      Terms of Use link), or add a custom one.

## 4. The build
- [ ] **EAS build** containing the current paywall (auto-renew disclosure +
      Terms/Privacy links) and the wired StoreKit purchase → upload to
      App Store Connect.
- [ ] Verify with a **sandbox tester**: reach the paywall with the test account →
      **Start your 3-day free trial** → purchase succeeds → parent mode unlocks.

## 5. Submit
- [ ] Attach the subscription to the app version and submit both together.

## Review notes (paste, fill the blanks)
> Parent mode (the parent dashboard, progress tracking, goals, and assigned
> practice) already exists in the app. In this version it's now gated behind a
> new auto-renewable subscription — Parent Pro (com.mc.mathpad.parentpro,
> $7.99/month, 3-day free trial) — which also unlocks every learning module for
> the family's children.
>
> To test the purchase: sign in as a parent as usual; the Parent Pro paywall now
> appears in place of the dashboard. Tap "Start your 3-day free trial" and
> complete it with a sandbox tester — the dashboard and all modules then unlock.
> "See what's included" on the paywall shows a preview.
>
> Test parent account: [EMAIL] / [PASSWORD]

## Anti-rejection note
This gates parent mode behind a new subscription. To pre-empt a "previously-free
content moved behind a paywall" flag, the notes make clear it's a **new premium
parent tier**, that **kids still get free Addition + any one-time-IAP modules**,
and that **"Continue without Parent Pro"** lets a parent skip it and just let
their kid practice.
