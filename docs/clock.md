# Clock module — design notes (proposal, not built)

Status: **design / discussion.** Clock is a "Coming Soon" topic
(`components/panels/MainPanel/topics.ts`, `enabled: false`). This captures the
intended design so we don't start from scratch when we build it.

## Principles (keep MathPad's DNA)

- **Kids *do* it, by hand — no multiple choice.** Reuse handwriting + tactile
  interaction, not tap-the-answer quizzes.
- **Calm, premium, educational.** Same look/feel as the rest of the app.
- **Reuse the shells:** per-topic **settings** screen, **practice → results →
  review** flow, **History**, and a **"How to solve"** demo — same patterns as
  the operations module. Only the *question/answer surface* is new.

## The core idea: three "languages" of time

Telling time means bridging:
- **Analog face** (hands on a dial)
- **Digital** (`6:30`)
- **Spoken/words** ("half past six," "quarter to nine," "twenty past five")

Kids naturally say "half past 6," so the module must teach the **words register**
and its link to digital + analog — not just digital readout.

## Question / answer types

The kid always **reads the analog clock** (the skill taught in school). Two answer
formats, plus a mix — selectable in settings:

1. **Read → write digital.** Show the analog clock; the child **handwrites the
   time** (`6:30`) into HH:MM boxes. *Reuses the existing handwriting recognition
   engine — the most on-brand answer mode.*
2. **Read → build the phrase (drag tiles).** The child drags word tiles to build
   the spoken time — `half` · `quarter` · `past` · `to` · `o'clock` · hour 1–12
   (e.g. "half past six"). Teaches the words register. **In v1** (see decisions).

Default = **Mixed** (alternate the two).

*Optional / future:* a **Set → drag the hands** mode (given a time, move the hands
to match), **snap-to-grid** per difficulty. Not a v1 primary — noted as a natural
later addition.

Note: "digital" (`6:30`) is only the **answer format**; the clock shown is always
analog. It's not a separate clock type.

## The clock face (the "impressive + educational" centerpiece)

A clean **Skia analog clock** with **training wheels that fade with difficulty**:

- Hour numbers 1–12, minute ticks with **bold 5-minute ticks**.
- **"Count by 5" outer ring** (00, 05, 10 … 55) in a soft color — the scaffold
  that actually teaches minutes. On in Simple, off in Hard.
- **Color-coded hands** (hour vs minute) matching the answer boxes / tiles.
- **Realistic hour-hand position** — at 6:30 the hour hand sits *between* 6 and 7
  (fixes the most common kid mistake; the how-to demo calls this out).
- **Live readout while dragging:** moving the minute hand updates the words +
  digital in real time ("…twenty past… twenty-five past… half past") — a
  discovery/explore loop.
- **Past → to flip** animated at the 6 (right half = "past," left half = "to"),
  optionally shaded in Simple mode.
- **Snap** to valid positions per difficulty (quarters / 5s / any minute).

## Complexity (named by the minute step, not "easy/medium/hard")

- **15s:** `:00 :15 :30 :45` → o'clock · quarter past · half past · quarter to.
- **5s:** every 5 minutes → "ten past," "twenty to," "twenty-five past," etc.
- **Minutes:** any minute (`:01–:59`), with the realistic hour-hand position.

## Settings page (mirrors the operation settings screen)

- **Number of questions** (reuse the existing selector).
- **Type** (answer format): **Digital** (write `6:30`) · **Pattern** (build the
  phrase with tiles) · **Mixed** (default).
- **Complexity** (minute step): **15s** · **5s** · **Minutes**.
- **Training wheels:** show/hide the count-by-5 ring + hand colors (on for 15s,
  fading as the step gets finer; overridable).
- Answers stay in the **1–12 range with no AM/PM** for v1 (morning/evening = a
  later/advanced option).

## "How to solve" (clock demo)

A worked example like the operations how-to: animate the hands into place while
on-screen labels bridge the registers — e.g. "short hand just past 6 → it's 6-
something; long hand on the 6 → 30 minutes → **half past six = 6:30**." Reinforces
the realistic-hour-hand idea.

## Localization (important)

The **words register is grammar-specific**, not a literal translation:
- English: "half past six," "quarter to nine."
- Spanish: "las seis y media," "las nueve menos cuarto."
- Arabic: "السادسة والنصف" (six-and-a-half), "الثالثة إلا ربع."

So the word-builder needs **per-language phrase templates** (hour ordering,
"past/to" vs "and/menos," etc.), driven by i18n. **English first** (matches the
app's V1 language), structured so other locales plug in. The analog/digital/drag
modes are language-independent and work everywhere.

## Build notes (when we implement)

- New surface: a `ClockWorkspace` (Skia clock + the chosen answer input). Reuse
  `ScreenContainer`, `Header`, `Card`, `Button`, the score/history/how-to shells,
  and design tokens.
- New generator: `lib/clockGenerator` (pick a time per complexity, produce the
  prompt + expected answer in all three registers).
- Flip the topic to `enabled: true` in `topics.ts` and replace `app/clock.tsx`
  (currently the ComingSoon placeholder) with the settings entry.
- Pricing: TBD — likely its own module IAP per the `pricing` skill (not part of
  the Operations bundle). Free slice TBD (e.g. Simple/o'clock).

## Decisions (locked — 2026-06-04)

- **The kid reads an analog clock** (the school skill). Two answer formats:
  **write the digital time** and **build the spoken phrase from draggable
  tiles** — plus a **Mixed** default.
- **Settings = Type + Complexity** (plus number of questions):
  - **Type:** Digital · Pattern · Mixed.
  - **Complexity:** 15s · 5s · Minutes (the minute step).
- **Pattern (words) ships in v1** → spoken-phrase tiles are part of the first
  version; per-language grammar starts with **English**, structured so other
  locales plug in.
- **Answers stay 1–12, no AM/PM** for v1 (morning/evening 24-hour is later).
- **Set-the-hands** mode (if added, later) uses **snap-to-grid** per complexity.

## Still open

- **Free slice + pricing** for the Clock module (its own IAP per the `pricing`
  skill? which complexity tier is the free taster?).
- **Exact tile set / phrasing per tier** (e.g. does Medium include "twenty-five
  past"? "twenty to"?).
- Whether to add the optional **set-the-hands** mode in v1 or defer it.
