# MathPad — App Specification

## Overview

**App name:** MathPad (working name)

**One-liner:** A mobile math practice app where kids solve +, −, ×, ÷ problems by writing directly on screen with their finger or stylus — preserving real scratch work like borrowing and carrying — with instant marking, fixable mistakes, and locally-stored history.

**Target users:** Elementary and early middle-school students ages 5–12, plus their parents and tutors.

**Platforms:** iOS (iPad + iPhone) first via Expo / React Native. Android (Samsung S Pen, Chromebooks) later from the same codebase.

**Business model:** Consumer one-time purchase (~$9.99 App Store), launched in multiple countries. Fully offline. No backend, no accounts, no external network calls, no analytics, no ads.

**Reference POC:** `~/mathpad-recognition-test/` — validated handwriting recognition on real device. Use the same recognition library and proven Skia setup unless there's a strong reason to change.

---

## Core principle

Unlike worksheet apps that only check the final answer, MathPad preserves the kid's actual handwriting and scratch work — crossing out digits, writing small borrowed/carried numbers above, etc. The kid writes naturally, and the **scratch work** is never recognized or altered.

**Final-answer digit boxes are live-recognized during practice.** When the kid finishes writing a digit in a final-answer box (integer / decimal / remainder) and pauses, the app recognizes that one box immediately and replaces the raw ink with a clean canonical digit — so an early misread (e.g. a `0` read as `6` from an unclosed loop) is visible on the spot instead of only at Results. If the ink is unreadable, the box is cleared and a light "couldn't read that — try again" prompt appears (single "Got it" button); if the kid wrote **more than one digit** in a single box, a "one digit per box" prompt appears instead and the box is cleared. Recognition fires after a short idle delay (~500 ms) so a digit drawn in two strokes (4, 5, 7) isn't read mid-stroke. Recognition failure fails *open* (the box is left untouched, never wrongly rejected). The whole answer is still re-recognized at "Finish" for marking; because the clean glyph recognizes identically, live and Finish results always agree. This live conversion applies to **every digit cell** — answer boxes *and* the working cells (carry, partial products, times-carry, long-division draft and divisor-carry). Only the **sign box** (a minus, not a digit) is excluded, and it is **off during the review/"Show errors" flow**, where the kid's original ink must stay visible.

**Scratch work is for the kid's own use — never used for marking.** Marking depends exclusively on the recognized digits in answer boxes.

---

## Screens

### 1. Home
- Greeting + five large topic cards in a grid:
  - **Addition** (+, blue accent)
  - **Subtraction** (−, coral accent)
  - **Multiplication** (×, purple accent)
  - **Division** (÷, teal accent)
  - **Mix** (mixed operations, neutral accent)
- Bottom row: History pill, Settings pill
- Tapping a card → Settings screen for that operation

### 2. Settings (per operation, adapts to selected topic)

**Common to all operations:**
- Digits: range-based — user picks a min and max from {1, 2, 3, 4}. Each question's digit count is randomized within the range. Default: 2 to 3.
- Number of questions: single-select chips — 5, 10, 15, 20. Default: 10.
- Timer (optional, off by default). When on, user picks total session duration (3, 5, 10, 15 minutes). Single countdown for the whole session.

**Operation-specific:**

- **Addition:**
  - Carrying — With / Without / Random
  - **Decimals** — Off (default) / On / Random
- **Subtraction:**
  - Borrowing — With / Without / Random
  - **Allow negative answers** — Off (default) / On / Random
    - *Off:* bigger operand always on top
    - *On:* smaller operand may be on top, producing negative answers (e.g. `5 − 8 = −3`)
    - *Random:* mix of positive and negative answer problems
  - **Decimals** — Off (default) / On / Random
- **Multiplication:**
  - Regrouping — With / Without / Random
  - **Decimals** — Off (default) / On / Random

- **Decimals (Off / On / Random)** for +/−/×: operands carry 1–2 decimal places
  (× capped so the product stays ≤ 3 places). The vertical layout aligns operands
  and answer on a **pre-printed decimal point** (a fixed column), and the
  carrying / borrowing / regrouping scaffolds work across the fractional columns —
  a carry/borrow crosses the decimal point like any other column. *Random* mixes
  decimal and integer questions in a session.
- **Division:**
  - Division type — **In a row** (`a ÷ b = `) or **Long division** (bracket staircase).
    Chosen up front in settings and fixed for the whole session (no mid-solution toggle).
  - Answer type — Without remainders / With remainders / **With decimals** / **All types**
    - *Without remainders:* clean integer division (`12 ÷ 4 = 3`)
    - *With remainders:* (`13 ÷ 4 = 3 R 1`)
    - *With decimals:* answer has up to 3 decimal places (`15 ÷ 4 = 3.75`). Generator only picks problems with terminating decimals — no infinite repeating answers
    - *All types:* mixes the three across the session
- **Mix:** All four operations; each question randomly picks an operation; respects digit range. No regrouping/borrowing/remainder/negative/decimal constraints (mix stays simpler intentionally).

**Live summary line** at the bottom updates as user changes settings.

**Persistence:** Last-used settings per operation saved locally; restored on next entry.

**"Start practicing"** button at the bottom.

### 3. Practice

**Top bar:** Close (X), "Question X of Y" + progress bar, Timer if enabled, Help (?).

**Problem display:**
- Vertical math format for +, −, × (right-aligned monospace digits, operator on the left of second row, horizontal line below)
- Division layout set by the **Division type** setting (fixed for the session):
  - *In a row* → horizontal `a ÷ b = [ ]` (decimal-aware answer area when the answer is a decimal — see below)
  - *Long division* → bracket staircase layout with intermediate work zones

**Answer area — standard (integers, remainders):**
- One constrained handwrite box per digit column (right-aligned)
- For "Allow negative answers" mode: an extra leftmost box that accepts either a minus sign or stays blank
- Each box captures finger / Pencil ink via Skia
- Tap to highlight; per-box clear button

**Answer area — decimal mode:**
- Integer boxes on the left
- A **pre-printed (non-handwritten) decimal point** between integer and decimal boxes
- Up to 3 decimal boxes on the right
- Kid leaves trailing decimal boxes blank if their answer has fewer decimal places
- The pre-printed dot eliminates decimal-point recognition errors and avoids locale `.` vs `,` confusion in handwriting (the displayed separator follows locale)

Example decimal layout for `15 ÷ 4 = ?`:[ ] . [ ][ ][ ]

**Scratch area:** Large free-form Skia canvas above or beside the problem. Kid can cross out digits, write small borrowed/carried numbers above the problem digits. Toolbar: eraser, undo, clear all. Used by the kid only — never recognized, never used for marking.

**Toolbar:** Eraser (toggle), Undo, **Finish** (primary).

### 4. Score

**Top:**
- Two scores displayed prominently:
  - **First try:** X / Y
  - **Final:** X / Y (updates after resubmissions)
- Encouragement text varies by final score:
  - 100%: "Perfect!"
  - 70%+: "Great job!"
  - 40–69%: "Nice work — keep practicing!"
  - <40%: "Good effort — let's try again!"

**Question list:** Scrollable. Correct (first try) shows green check. Wrong (not fixed) shows coral indicator with kid's wrong answer struck through next to correct. Wrong (fixed) shows green check + small "fixed" badge. Each question is tappable to reopen for editing.

**Bottom:** Home / Again buttons.

**On session completion, save to local history.**

### 5. Question review/edit (from Score)

- Reopens the original Practice layout for that single question
- **Original ink fully preserved** — scratch work and answer boxes restored exactly as the kid left them
- Kid can edit any answer box and modify scratch work. Clearing a box (its ✕) also clears every box solved *after* it (carries, partials, long-division staircase) — fixing an upstream digit invalidates everything downstream.
- **"Show errors" (opt-in toggle):** highlights every box — final answer *and* working (carries, partial products, long-division staircase) — with a green border when correct and a red border when wrong, so the kid can see *where* the mistake started. Off by default (re-attempt unaided first); recognises each written box and compares to the correct digit. A required answer box left blank reads red; blank working cells stay neutral. Any edit clears the highlights until re-tapped.
- "Submit" re-runs recognition, updates the question's status, updates final score
- Returns to Score screen

### 6. History

- Reverse chronological list of completed sessions
- Each entry: date/time, operation icon, first-try score badge, final score badge, duration
- Tap → detail view: list of questions, kid's final answer vs correct answer (no ink replay, just digits)
- **"Clear all history"** button with confirmation dialog

---

## Question generation rules

All generation is local, deterministic logic. No external calls. Implemented in `/lib/questionGenerator.ts` with full unit test coverage.

**Digit range:** Each operand's digit count picked randomly within the user-selected range.

**Mode constraints (must be enforced, not just statistically likely):**

- **With carrying:** at least one column sum ≥ 10
- **With borrowing:** at least one column where minuend digit < subtrahend digit
- **With regrouping:** at least one partial product carries
- **With remainders:** dividend not evenly divisible by divisor; remainder > 0
- **With decimals:** dividend/divisor pair produces a terminating decimal answer with ≤ 3 decimal places. Generator filters out any combination that would produce a repeating decimal.
- **Without [mode]:** problem guaranteed not to require it
- **Random:** mix of both

**Negative answers (subtraction, "Allow negative" on):** Smaller operand on top, larger on bottom, ensuring a negative result.

**Other rules:**
- No fractional answers in addition/subtraction/multiplication (always integers)
- Multiplication: no negative answers in v1
- Division: divisor ≥ 2
- Mix mode: each question randomly picks an operation; respects digit range; uses default "off"/no-special-mode constraints (no negatives, no decimals — keeps mix accessible)

---

## Scoring rules

- **First try score:** Locked at the moment of initial Finish (or timer expiry). Never changes.
- **Final score:** Starts equal to first-try; increases as kid fixes wrong answers.
- **Blank answer = wrong.**
- **Timer expiry:** Auto-submits current state. Blank or incomplete answers count as wrong.
- Per-question status: `correct_first_try`, `wrong`, `fixed`.

**Marking edge cases:**
- **Mathematical equivalence wins over form** for decimals: if correct answer is `3` but kid writes `3.00`, marked **correct**. Trailing decimal zeros = mathematically equal.
- Missing decimal digits when expected → wrong (correct is `3.75`, kid writes only `3` → wrong).
- Extra decimal digits when none expected → correct only if they're zeros (`3.00 = 3`); any non-zero decimal makes it wrong.
- For negative-answer mode: sign and digits must both match. Correct `−3`, kid writes `3` → wrong. Correct `3`, kid writes `−3` → wrong.

---

## Recognition requirements

The recognizer must classify the following inputs:
- Digits 0–9 (10 classes)
- Minus sign `−` (only used in the optional leftmost sign box, only when negative-answers mode is on)
- **No decimal point recognition needed** — the decimal point is pre-printed in the UI, never handwritten

**Recognition adapter** is the abstraction layer between the app and the chosen library. The app only calls `recognizeDigit(strokes)` and `recognizeSign(strokes)`. Library can be swapped without touching screens.

If the recognition library doesn't natively support a `−` class, fall back to a small "+/−" toggle button next to the answer instead of handwritten sign — the kid taps it. This is uglier but reliable. Decide during Phase 2 implementation based on what the POC library supports.

---

## Visual & interaction design

- **Style:** Clean Apple-style — minimal, calm, focused. Not babyish, not corporate.
- **Typography:** System sans, two weights (regular + medium), sentence case throughout (in English; respect target-language conventions when localized).
- **Color:** Mostly neutral. One accent color per operation (+ blue, − coral, × purple, ÷ teal, mix neutral). Green for correct, coral for wrong.
- **Encouragement:** Text only ("Great job!"). No stars, streaks, sound effects, or reward-driven characters/mascots. (A brand mascot may appear as decoration — e.g. the home-screen hero — but never as a gamified reward or feedback mechanic.)
- **Accessibility:** Large tap targets (≥44pt), VoiceOver labels on all interactive elements, scalable text size, high-contrast colors, Dynamic Type support.
- **Responsive:** Tablet (iPad — primary) and phone, both portrait and landscape. iPad landscape gives scratch area a larger side panel.

---

## Architecture & code organization

### Modular design principles

The app is built as a layered system. Each layer has a clear responsibility and a stable interface. Changes within a layer should not propagate to other layers. Reusable UI lives in a shared library; feature screens compose from it.

### Layers (top to bottom)

1. **Feature screens** (`/app`) — compose primitives + domain components. Contain no business logic.
2. **Domain components** (`/components/domain`) — math-specific reusable UI: `AnswerBox`, `ScratchCanvas`, `ProblemDisplay`, `QuestionResultRow`, `OperationCard`, `DigitRangeSelector`, `ModeRadioGroup`, `TimerDisplay`, `DecimalAnswerRow`, `SignedAnswerRow`.
3. **Primitive UI components** (`/components/ui`) — generic reusable UI: `Button`, `Chip`, `RadioRow`, `Card`, `IconButton`, `Header`, `ScreenContainer`, `Pill`, `ConfirmDialog`, `EmptyState`. Pure presentation, no business logic.
4. **Hooks** (`/hooks`) — `usePracticeSession`, `useSettings`, `useHistory`, `useTimer`, `useRecognition`. Encapsulate stateful logic and side effects.
5. **Library code** (`/lib`):
   - `questionGenerator/` — pure logic, fully tested
   - `recognition/` — **adapter pattern**. Public API: `recognizeDigit(strokes)`, `recognizeSign(strokes)`. Internal implementation wraps the chosen library. Swappable without touching anything else.
   - `storage/` — adapter over AsyncStorage / SQLite. Public API: `historyStore`, `settingsStore`. Implementation details hidden.
   - `i18n/` — translation lookup, locale detection, RTL handling
   - `scoring/` — pure scoring logic, including decimal equivalence checks
6. **Design tokens** (`/constants/design.ts`) — single source of truth for colors, typography, spacing, radii, shadows, motion durations. Every component reads from this; no hard-coded values anywhere else.
7. **Types** (`/types`) — shared TypeScript types: `Question`, `Operation`, `Settings`, `SessionResult`, `RecognitionResult`, etc.

### Rules

- No screen imports another screen's internals
- No domain component imports a feature screen
- Primitives never import domain components
- All cross-cutting concerns (storage, recognition, i18n) go through their adapter — never called directly
- Every component takes props; no global state read inside components except via well-defined hooks
- Style values come from design tokens — never hard-coded
- All user-facing strings come from i18n — never hard-coded in components

### Testing

- Pure logic (`questionGenerator`, `scoring`) has unit tests via Jest, including decimal equivalence and negative-answer cases
- Domain components have render snapshot tests
- Critical user flows (practice session end-to-end) have integration tests where practical
- Recognition adapter has a mock implementation for tests so tests don't depend on the real library

---

## Internationalization (i18n)

v1 ships **English only**, but the codebase is fully prepared for multi-language from day one.

### Requirements

- All user-facing strings live in translation files (`/lib/i18n/locales/en.json`, future: `ar.json`, `es.json`, etc.). No hard-coded strings anywhere in components.
- Use `i18next` + `react-i18next` (or equivalent) — supports pluralization rules, interpolation, fallbacks.
- Locale detection: read device locale on app launch; fall back to English if unsupported.
- A settings option to manually override device locale.
- RTL support via `I18nManager`. UI components must use logical layout properties (`start`/`end`) rather than `left`/`right` where possible.
- Component layouts must flex with string length — no fixed-width buttons with text inside.
- Math problems themselves always use Western Arabic numerals (0–9) and standard math symbols, regardless of UI language.
- **Decimal separator follows locale:** displayed as `.` in en-US/en-GB/ja, `,` in most of Europe and Latin America. The pre-printed separator in the answer area reflects the active locale.

### Locales to plan for (v1.x roadmap, not v1)

- Arabic (RTL test case)
- Spanish (Latin America focus)
- French
- German (long-string test case)
- Mandarin Simplified
- Portuguese (Brazil)

### What's bundled vs runtime

- All translation strings are bundled in the app — no remote fetch.
- Each additional language adds ~50–100 KB to app size.

---

## Local data storage

All data stays on the device. No cloud, no sync, no external calls.

- **Settings:** last-used settings per operation
- **History:** every completed session
  - date/time, operation, settings used, first-try score, final score, duration, per-question details (problem, kid's final recognized answer, correct answer, status)
  - Raw ink stroke data NOT persisted (too large, not useful long-term)
- **In-memory only (cleared at session end):** Skia stroke data per question — held only during the active session to support the review/edit feature

### History controls

- "Clear all history" button in History screen with confirmation dialog
- No size limits initially (data is small); revisit if size becomes an issue

---

## Privacy & offline guarantees

- Zero external network calls at runtime
- No analytics, no crash reporting (or strictly opt-in, off by default)
- No ads, no third-party SDKs that phone home
- No user accounts, no PII collected
- Privacy policy reflects: data stays on device, nothing transmitted, user controls deletion

---

## Known technical risks (acknowledged, must be handled)

1. **Ink persistence across edit/resubmit** — Skia strokes must be held in memory and restored. Implementation detail of `usePracticeSession` hook. Budget time.
2. **Long division layout** — different UI, recognition zones, scratch zones from horizontal layouts. Larger build than other operation layouts.
3. **Decimal division generator** — must filter out non-terminating decimals reliably. Implementation: compute the answer, check if it terminates within 3 decimal places, retry if not. Cap retries to avoid infinite loops.
4. **Decimal answer marking** — mathematical equivalence required. `3 = 3.0 = 3.00 = 3.000`. Scoring logic compares numerical value, not string form.
5. **Negative sign input** — verify recognition library supports `−` as a class. If not, fall back to a `+/−` toggle button instead of handwritten sign.
6. **Timer + auto-submit mid-stroke** — handle gracefully: finalize active stroke, then submit.
7. **Palm rejection on iPad** — Skia doesn't handle it natively like PencilKit. Custom logic needed to ignore palm touches when an Apple Pencil is in use.
8. **Recognition adapter** — keep the abstraction clean so the library is swappable.
9. **Mix mode transitions** — switching layouts mid-session needs smooth transitions, no layout jumps.
10. **i18n + RTL** — flips need testing once Arabic or Hebrew is added. Build structure correctly now.

---

## Out of scope for v1 (explicit)

- User accounts, login, multi-kid profiles
- Cloud sync, backups, multi-device
- Teacher dashboards, classroom features, sharing
- Leaderboards, achievements, stars, streaks, reward-driven characters/mascots (a brand mascot as decoration is allowed)
- Word problems, fractions as input, negative answers in multiplication
- Sound effects, music, haptics beyond default
- Onboarding tutorial (defer to v1.1 based on user feedback)
- Languages other than English (structure ready, content English-only)
- Any external network call, analytics, crash reporting, ads
- Long-term storage of raw ink stroke data
- European-style long division