---
name: pricing
description: MathPad monetization model — pricing tiers, free-tier strategy, cross-sell rules, and target-buyer profile. Use whenever the user wants to discuss, revisit, or adjust the pricing/monetization/IAP/bundle/trial/free-tier strategy. Activate on terms like pricing, monetize, IAP, bundle, free tier, trial, subscription, App Store Connect, StoreKit, paywall, unlock, entitlement.
---

# MathPad — Pricing Model

This is the **locked monetization strategy** for MathPad, agreed jointly between the user and Claude. Re-open this discussion only when the user explicitly invokes pricing topics. Do not unilaterally suggest pricing changes during unrelated dev work.

## 1. The model

> **Ship status (2026-06-03):** The **Operations tier** (free Addition + $9.99 for the rest) is now a **V1 launch deliverable — live at launch** (see [[V1]]). Clock / Shapes / Axis tiers and the **Complete bundle** remain deferred until those modules are built. The model below is unchanged; only the rollout timing of the Operations tier moved forward.

Per-module non-consumable IAPs, with a free entry slice in each module and a Complete-bundle discount for buyers who want everything.

| Tier | Price | What it unlocks | Free slice |
|---|---|---|---|
| **Operations (core)** | **$9.99** | Subtraction + Multiplication + Division + Mix | **Addition is free** — full features, all settings, history, score, review |
| **Clock** | **$4.99** | Full module | TBD when module is built (e.g. whole-hour reading) |
| **Shapes** | **$7.99** | Full module | TBD when module is built (e.g. basic 2D shapes naming) |
| **Axis** | **$7.99** | Full module | TBD when module is built (e.g. first-quadrant plotting) |
| **MathPad Complete (bundle)** | **$24.99** | Everything, including any future modules covered by the bundle SKU | — |

Piecemeal total: $9.99 + $4.99 + 2 × $7.99 = **$30.96** → Complete saves **$5.97 (19%)**.

> Clock price set to **$4.99** (2026-06-08), down from the $7.99 placeholder.

> **Complete bundle is deferred** until more modules ship — selling "everything"
> when most modules are still "Coming soon" is poor value and risks App Store
> review. The "Unlock everything" buttons are gated behind
> `COMPLETE_BUNDLE_ENABLED` (`lib/featureFlags.ts`, currently `false`) on every
> unlock page; flip it to `true` once Shapes/Money/Axis exist.

## 2. Free-tier philosophy

- **Free tier, NOT free trial.** No timers, no "X days left," no anxiety mechanics. The free slice is permanent and genuinely useful.
- **Each module gets one real sub-topic free**, sized so a kid can use it productively for 3–6 months before outgrowing it. The free slice is *not* a crippled demo — it's a full vertical slice (full features, full settings, full history).
- **No 5-questions-and-locked freemium.** Reviewers hate it. Parents hate it. Don't ship it.
- **Trials are explicitly rejected** for this app because:
  1. The SPEC forbids backend/accounts → trial state lives on-device → trivially cheatable by reinstall.
  2. Trial expiry creates urgency anxiety, which is the wrong vibe for kids' education.
  3. Apple's trial mechanic is subscription-only; for non-consumable IAPs we'd have to build it from scratch.
  4. Trial-end is an emotional rug-pull for kids who built habit on the app.

## 3. Cross-sell rules

**Where it's OK to surface locked modules / paid upgrades:**

1. **Home screen** — all four modules are always visible as cards (Operations / Clock / Shapes / Axis). Locked modules show a "Try Free" CTA, never "BUY NOW."
2. **Module preview screen** — replaces today's `ComingSoon` panel. Shown when a kid taps a locked module from Home. Contains: hero screenshot, "what you'll learn" bullets, big "Start Free Topic" button, secondary "Unlock for $X.99" button with tiny "or get Complete →" link.
3. **Settings → Store page** — single screen listing all modules, their ownership state, and Complete-bundle CTA at the top.
4. **30-day usage nudge** — after 30 days of free-Addition use, ONE dismissible Home-screen banner: "Ready for Subtraction? Unlock the rest of Operations for $9.99." Never reappears after dismissal.

**Where it's NOT OK to upsell:**

- ❌ Mid-session (during Practice) — never.
- ❌ On the Score screen — that's for celebration, not selling.
- ❌ On the Review/Edit screen — kid is correcting work, not shopping.
- ❌ Pop-up modals, interstitials, or "limited offer" countdown timers — anywhere.
- ❌ Anything that interrupts a kid's flow.

## 4. Target buyer profile

This pricing is designed for the **premium-education parent**, not the median parent:

- iOS/iPad-household income skew (above-average disposable income)
- Already spending on enrichment: tutoring, Kumon, private school, music lessons
- Will compare MathPad to "a LEGO set" or "an hour of tutoring," not to "a $0.99 game"
- Values the handwriting/scratch-work UX over algorithmic worksheet apps

Implication: **marketing matters more at this price tier than at $0.99.** Impulse buys at $9.99 don't exist. Clean App Store listing, screenshots, a 30-second demo video, and parent-targeted keywords carry every conversion.

## 5. Operating constraints (per SPEC)

- **No backend, no accounts** — entitlement state lives on-device + Apple's StoreKit receipt
- **No analytics** — cannot A/B test pricing; commit to a model and judge by sales count + App Store reviews
- **No ads, no telemetry** — pricing decisions can't be validated by usage data, only by review sentiment
- **Fully offline** — all gating must work without network; StoreKit's local receipt validation is the only check

These constraints **rule out** subscriptions-with-server-validation, server-side trials, dynamic pricing, segment-based offers, and most "growth hacking" tactics. If a future pricing idea requires a backend or analytics, flag it against this constraint first.

## 6. Implementation work TBD

The pricing model is locked but the code is not built. Future work (not in this session):

1. **StoreKit integration** — `expo-in-app-purchases` or a more current Expo SDK 54 module; purchase, restore-purchases, receipt validation.
2. **Entitlement module** — `isModuleUnlocked('clock')`, `isOperationUnlocked('subtraction')`, etc. Single source of truth queried everywhere.
3. **Home screen update** — always show all four module cards; show lock state.
4. **Module preview screens** — one per module, replaces the current `ComingSoon` placeholder.
5. **Settings → Store page** — module list with ownership status + Complete-bundle CTA.
6. **Lock badge UI** — small "🔒" or "Try Free" pill on locked operation cards inside Operations.
7. **30-day nudge mechanism** — first-launch timestamp persisted locally + dismissal flag.
8. **App Store Connect IAP product setup** — define product IDs (suggested: `com.mc.mathpad.operations`, `.clock`, `.shapes`, `.axis`, `.complete`), pricing tiers, localizations.
9. **Family sharing** — should be ON for all non-consumable IAPs (one parent buys, all kids in the Apple Family get it). High-leverage with kids' app perception. *Pending final user confirmation.*
10. **Refund-safe IAP confirmation copy** — clear "You are purchasing X for $Y.YY" modal text so accidental kid-taps don't generate refund complaints.

## 7. Decisions still pending

Things that were discussed but not finalized — confirm with the user before treating as locked:

- **Family sharing enabled?** Recommended: yes. User to confirm.
- **Free slices for Clock / Shapes / Axis** — deferred until those modules are built; design each free slice when designing the module.
- **Price tiers in low-income markets** — Apple's automatic localization may price too high in some countries. Pending review of App Store Connect storefront-specific pricing once IAP products are set up.
- **Whether the Complete bundle covers future modules** — Apple bundles can include future SKUs, but only if structured that way at creation. Pending decision at App Store Connect setup time.

## 8. Rules for working in this skill

1. **Don't relitigate locked decisions** unless the user explicitly asks. The pricing table in §1, the free-tier vs free-trial decision in §2, and the cross-sell rules in §3 are agreed and shouldn't be re-debated each time.
2. **Do challenge new pricing ideas** that contradict the model — gently, with the relevant rule from this file cited. (E.g., if the user proposes a subscription, point to §5: "subscription model conflicts with offline + no-backend constraint.")
3. **Use canonical names** when talking about tiers: "Operations IAP," "Complete bundle," "free Addition tier," "Clock module preview." Match the language in §1.
4. **Reference §6 (Implementation TBD)** when the user asks "what do we need to build for pricing?" Don't re-derive.
5. **Update this file** when the user formally changes a pricing decision. Don't keep stale numbers in §1.
