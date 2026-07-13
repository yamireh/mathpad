---
name: clock
description: Use whenever the user references the Clock / telling-time module — clock face, hour/minute hands, "set the hands", digital answer, pattern/words tiles ("half past six"), complexity 15s/5s/minutes, clock settings/practice/results/fix, or any Clock* component. Loads where the clock code lives, the component map, the built behavior, key design decisions, and the conventions for changing it. Activate on terms like clock, telling time, analog/digital clock, hands, set the time, pattern tiles, clock complexity.
---

# MathPad — Clock module

The Clock (telling-the-time) topic. **It is built** and lives on `main` behind a
feature flag. Treat the **code as the source of truth for implementation**; the
planning docs (below) describe intent and are partly stale.

## Status & gating

- Built, gated by `CLOCK_ENABLED` (`lib/featureFlags.ts`) — **currently `= true`,
  i.e. LIVE in production** (V1.2, paid Clock IAP). The flag flips it to
  "Coming Soon" only if set back to `__DEV__`/`false`. Always check the code, not
  this line, for the live value.
- `app/clock.tsx`: `CLOCK_ENABLED ? <ClockModule/> : <ComingSoon/>`.
- Parent-mode: Clock sessions sync to the parent dashboard (`ClockModule` commits
  once on Home/Again via `maybeSync`; shows as a blue "Clock" group).
- Topic card: `components/panels/MainPanel/topics.ts` (Clock entry, `enabled` flag;
  placed above Shapes).
- Planned as **V2.0** (see `versions` skill / `V2.0.md`). Pricing: its own module
  IAP (**$7.99**, `com.mc.mathpad.clock`) per the `pricing` skill. **Gating built
  (Slice 1 stub):** `lib/entitlement` `isClockUnlocked` + `CLOCK_PRODUCT_ID`,
  `usePurchases` `clockOwned`/`clockPrice`/`purchaseClock`, `clockEntitlementStore`,
  the unlock page `app/unlock-clock.tsx` (links to `/how-to/clock`), the locked
  Clock topic card (`MainPanel` → `/unlock-clock`), and an `app/clock.tsx`
  redirect guard. Real `expo-iap` purchase is still **Slice 2 / deferred**.

## Where it lives

- **Pure logic** — `lib/clock/`:
  - `types.ts` (`ClockTime`, `ClockStep`, `ClockAnswerType = 'digital'|'pattern'|'set'|'mixed'`, `ClockPhrase`)
  - `generate.ts` (`generateClockTime`, `STEP_MINUTES`)
  - `format.ts` (`formatDigital`, `clockPhrase`, `handAngles`, `pointOnClock`)
  - `question.ts` (phrase tokens, `check{Digital,Pattern,Set}`, `generateClockQuestions`, `resolveAnswerWith`)
  - `settings.ts` (`ClockSettings`, `defaultClockSettings`, `ClockResult`)
- **UI** — `components/domain/clock/` (all exported via its `index.ts`):
  - `ClockFace` — Skia dial: white face + rim, sharp arrow hands, blue hour / orange minute, ticks + minute ring.
  - `ClockNumbers`, `ClockRing`, `ClockTile` — dial sub-parts (proportional to size).
  - `SettableClock` — **draggable hands** (gesture-handler `Gesture.Pan`); hand selector, geared hour drift (3:15 → hour just past 3), minute snap per complexity, bold-while-dragging, tick haptic+sound.
  - `ClockLegend` — interactive hand selector. `SetClockPrompt` — "Set the time" box.
  - `DigitalClockAnswer` — HH:MM handwriting boxes (reuses recognition) + trash + undo icons.
  - `PatternBuilder` — drag word tiles to build the spoken time.
  - `HandwritingField` — `forwardRef` ink field (`{undo, clear}`).
  - `ClockHowToView` — "How to read a clock" worked-example, `forwardRef` `{play()}`: a guiding hand (`DemoHand`) demos all THREE modes in one slow continuous run, each titled (chip) with a transition card between them — **Set the time** (`SetClockPrompt` target "6:30" + real `ClockLegend` selector → drag hour hand 9→6 clockwise, then minute hand →30, starts at 9:00), **Say it in words** (tap word tiles → "half past six"), **Write the time** (the hand **handwrites** the digits into notebook boxes via `digitInk` + Skia reveal, matching `HandwritingField` style). A dimmed scrim transition card sits between modes. Each part ends with a ✓ + `successFeedback()`. Targets measured via `onLayout` so the hand lands on real elements. Route: `app/how-to/clock.tsx` (Clock settings bulb; future Clock unlock page links here).
  - `DemoHand` — the pointing-hand glyph (matches the operations auto-solve hand) positioned at an (x,y); used by the demo.
  - `ClockQuestionView` — renders set/digital/pattern; `forwardRef` `{judge()}`.
  - `ClockPracticeView` · `ClockResultsView` (tappable rows, Fixed chip, onFix) · `ClockFixView`.
  - `ClockSettingsView` — count + Type + Complexity (RadioRows with descriptions).
  - `ClockModule` — orchestrates phases **settings → practice → results → fix**.
  - `ClockPreview` — dev-only preview.
- **Colors** — `constants/design.ts` → `clockColors` (face, rim, ticks, hourHand, minuteHand, ring).
- **i18n** — `lib/i18n/locales/en.json` → `clock.*` and `clock.settings.*`.

## What's actually built (the reality)

- The kid **reads an analog face**; answer types: **digital · pattern · set · mixed**.
  ⚠️ **`set` (move the hands) IS built** — both planning docs list it as deferred; they're wrong, the code wins.
- **Complexity** (minute step): `quarter` (15s) · `five` (5s) · `minute`.
- Geared, draggable hands with realistic hour drift; tick haptic + synthesized
  `tick.wav` sound; responsive (iPad-scaled) sizing; results → fix loop.

## Conventions when changing it (also see the `develop` skill)

- **Don't touch the stable shared components** — reuse the reusable primitives
  (`components/ui`) and the shared settings/practice/results/history/how-to shells.
- **No big files, no big components, no inline styles** — component-based, each
  Clock* file small and single-purpose (this was an explicit instruction).
- Pure logic → `lib/clock`; UI → `components/domain/clock`; tokens →
  `constants/design.ts` `clockColors`. Update i18n for any new strings; export new
  components from `components/domain/clock/index.ts`.

## Cross-refs & staleness

- **Scope / release:** `versions` skill → `V2.0.md` (Clock = V2.0).
- **Original design rationale (the "why"):** `docs/clock.md`.
- Both **predate the build** and are partly out of date: they mark Set-the-hands
  as future (it's built) and name `ClockWorkspace` / `lib/clockGenerator` (don't
  exist — actual is `lib/clock` + `ClockModule`). Use them for intent, not API.

## Remaining clock work (not done)

- Saving clock sessions to **History**; the real Clock **IAP** via `expo-iap`
  (Slice 2 — needs an EAS build + App Store Connect product) + a **free slice**
  decision; localized phrase tiles beyond English.
- Done: ✅ "How to read a clock" demo (`ClockHowToView` / `app/how-to/clock.tsx`);
  ✅ Clock unlock page + gating (Slice 1 stub, $7.99).

## Maintaining this skill

Update this file when we make a **notable** clock change (new answer mode, new
complexity, major UX/decision) — not for routine code edits (git is the record).
If `V2.0.md` / `docs/clock.md` drift further from the build, reconcile them.
