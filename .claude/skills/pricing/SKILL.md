---
name: pricing
description: MathPad monetization model — pricing tiers, free-tier strategy, cross-sell rules, and target-buyer profile. Use whenever the user wants to discuss, revisit, or adjust the pricing/monetization/IAP/bundle/trial/free-tier strategy. Activate on terms like pricing, monetize, IAP, bundle, free tier, trial, subscription, App Store Connect, StoreKit, paywall, unlock, entitlement.
---

# MathPad — Pricing Model

This is the **locked monetization strategy** for MathPad, agreed jointly between the user and Claude. Re-open this discussion only when the user explicitly invokes pricing topics. Do not unilaterally suggest pricing changes during unrelated dev work.

## 0. Two models (added 2026-07-25)

MathPad now has **two distinct monetization surfaces**, and they use **different models on purpose**:

| Surface | Model | Rationale |
|---|---|---|
| **Kid learning modules** (Operations, Clock, …) | **One-time IAP** (§1) | Offline, owned forever. The no-backend/no-accounts/offline constraints (§5) apply here and rule out subscriptions. |
| **Parent Pro** (targets/stars, assigned exams, richer dashboard, **+ all modules for the family's kids**) | **Subscription (all-access)** | Parent Mode is already online + account-based (Firebase), so §5 does **not** apply to it. Inherently recurring/server-backed value → subscription is the right fit. The sub also unlocks every module for linked kids (household all-access, capped at 5 kids). |

**Parent Pro subscription — model LOCKED 2026-07-26:**
- **What it unlocks:** (a) the Parent Pro tools — targets & stars, parent-assigned exams (blind results), richer dashboard — **AND** (b) **every learning module for every child linked to the family**, while the subscription is active. One all-access price for the whole household.
- **One-time module IAPs stay** (§1): a parent who just wants their kid to practice can still buy modules à la carte — offline, no account, **owned forever**. This is the honest reason both coexist: **one-time = permanent ownership; subscription = all-access while active** (access lapses on cancel, unless the module was also bought once).
- **Two lanes, pick one:** à la carte (buy the modules you want, one-time) **or** all-access (subscribe → parent tools + all modules for your kids).
- **Family cap: 5 children per family — hard cap.** `MAX_CHILDREN = 5`, enforced in `lib/firebase/family.ts` on both add paths (`createChildProfile` and the kid-device `joinFamily`); throws `FamilyFullError`. Keeps an all-access subscription scoped to a real household, not shared with friends' kids. (Client-side today; server-side counter + rules enforcement is the abuse-hardening follow-up.)
- **How kids inherit access:** a Cloud Function validates the parent's StoreKit receipt server-side and writes `subscription: { active, expiresAt }` onto the **family doc**. Each linked kid device reads that field → entitlement = **family subscription OR local one-time purchase**. Cached with `expiresAt` + a grace window so it works offline and re-checks on next sync (kids already sync sessions). A **standalone kid** (no family linked) → one-time IAPs only, fully offline — the pure-offline path survives.
- **Abuse prevention (as agreed):** family-scoped entitlement + the 5-child cap + **server-validated receipt** (a client flag can't fake it) + **Apple Family Sharing ON** (the legit household path, up to 6). A parent equips their own kids, not 30 friends' kids.
- **Parent-authenticated only**, never kid-facing; purchase sits behind the grown-ups gate (COPPA + Apple kids-category rules).
- **Price: $7.99/month (set 2026-07-26), monthly-only for now.** A yearly (annual-forward) option is still open for App Store Connect setup (Slice 2). Buyer compares to Kumon $100–150/mo.
- Full design: `docs/parent-pro.md`. Targets marketing version **2.0.0**.

> Why this doesn't contradict §5: §5's "subscriptions conflict with offline + no-backend" is about the **kid app**. Parent Mode already has a backend and accounts — the subscription lives entirely on that already-online surface.

## 0.1 Access & entitlement architecture (LOCKED 2026-07-26)

The authoritative technical model for who can access what, and how it's verified.

**Identities (unchanged by the subscription):**
- **Parent** = a real Firebase **email/password** account. Creates and owns the family (`families/{id}.ownerUid`). Email/password is **parent-only** and stays even with the subscription — it's the stable identity the subscription is attached to (survives reinstalls/new devices, scopes entitlement, authorizes Firestore reads/writes, enables co-parents). Apple has no concept of the parent account or the family.
- **Child** = no login of its own: either an anonymous **kid-device** (joins the family via a **pairing code** the parent shares → `joinFamily(code, deviceUid, name)` → `children/{deviceUid}`) or a **"practice-as"** family entity the parent runs on their own device.

**All of parent mode is subscription-gated** (this *supersedes* the earlier "basic dashboard stays free" note in §0). Once signed in with a family, `subscription.active === false` → the parent sees the **paywall**, not the dashboard. Cancelling/expiry never signs them out, so they open straight to the paywall (signed-out → login first, then paywall). Their family/kids/history are never deleted, only gated. The paywall always offers an **escape hatch** — "just let my kid practice" — which switches the device to the regular **learner (child) role** (free tier + any one-time-IAP modules, no Pro).

**Access formula:**
- **Parent** can use parent mode ⟺ the family subscription is active (paid or trial).
- **Child** can play a module ⟺ `familySubscriptionActive` **OR** `moduleOwnedViaOneTimeIAP` **OR** `moduleIsFree` (Addition). One-time IAP is **device/Apple-ID-scoped**; subscription access is **family-scoped**.

**Who verifies what (critical):**
- 🍎 **Apple = all payment truth** (per Apple ID, on the owning device): one-time IAPs (StoreKit local receipt) *and* the parent's subscription (on-device StoreKit + the App Store Server API queried by the Cloud Function + App Store Server Notifications). Apple can only answer for the Apple ID asking — it has **no** concept of "the family."
- 🔥 **Firebase = identity + relationships + propagation** (never payment): parent identity, family ownership/membership, which kids are in the family, and the **mirror** `families/{id}.subscription = { active, expiresAt }`. Firestore **rules** authorize reads by account uid (family members may *read* the flag; **no client may *write* it** — only the Cloud Function via admin).
- **The crux:** a kid tablet has a different/irrelevant Apple ID, so **Apple will never tell it the parent's sub is active** — the kid device learns its entitlement **only** by reading `family.subscription` from Firestore. The **Cloud Function** is the sole bridge: it validates the parent's receipt with Apple (binding the transaction to the Firebase uid via StoreKit `appAccountToken`) and writes the verdict onto the family doc.

**Cancel vs. expire (propagation timing):**
- **Cancel** (auto-renew off) → Apple `DID_CHANGE_RENEWAL_STATUS` → CF records `willRenew:false` but **keeps `active:true` until `expiresAt`** (they paid through the period). Nothing revoked yet.
- **Expire / refund / grace-fail** → Apple `EXPIRED` / `REFUND` / `GRACE_PERIOD_EXPIRED` → CF flips `active:false`. This happens **server-to-server, no app open needed**. Backstops: parent-app StoreKit reconcile on launch + optional scheduled CF re-check near `expiresAt`.
- **Kid device revokes:** live Firestore `onSnapshot` on the family doc → **instant** when the flag flips; else next launch/sync; **offline** → it self-enforces the cached `expiresAt` (early refund only seen on reconnect). Optional small offline **grace window** so a transient drop doesn't cut a kid off mid-session.

**Abuse scope:** family-scoped entitlement + the **5-child hard cap** (`MAX_CHILDREN`, `lib/firebase/family.ts`) + server-validated receipts + **Apple Family Sharing ON** (the legit household path).

## 1. The model

> **Ship status (2026-06-03):** The **Operations tier** (free Addition + $9.99 for the rest) is now a **V1 launch deliverable — live at launch** (see [[V1]]). Clock / Shapes / Axis tiers and the **Complete bundle** remain deferred until those modules are built. The model below is unchanged; only the rollout timing of the Operations tier moved forward.

Per-module non-consumable IAPs, with a free entry slice in each module and a Complete-bundle discount for buyers who want everything.

| Tier | Price | What it unlocks | Free slice |
|---|---|---|---|
| **Operations (core)** | **$9.99** | Subtraction + Multiplication + Division + Mix | **Addition is free** — full features, all settings, history, score, review |
| **Clock** | **$7.99** | Full module | TBD when module is built (e.g. whole-hour reading) |
| **Shapes** | **$7.99** | Full module | TBD when module is built (e.g. basic 2D shapes naming) |
| **Axis** | **$7.99** | Full module | TBD when module is built (e.g. first-quadrant plotting) |
| **MathPad Complete (bundle)** | **$24.99** | Everything, including any future modules covered by the bundle SKU | — |

Piecemeal total: $9.99 + 3 × $7.99 = **$33.96** → Complete saves **$8.97 (26%)**.

> Clock ships at **$7.99** in v1.2.0 (the earlier $4.99 note from 2026-06-08 was
> reverted — the actual App Store IAP tier is $7.99).

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
