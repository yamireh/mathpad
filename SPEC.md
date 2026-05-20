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

Unlike worksheet apps that only check the final answer, MathPad preserves the kid's actual handwriting and scratch work — crossing out digits, writing small borrowed/carried numbers above, etc. The kid writes naturally; the app only converts handwriting to digits silently at "Finish" time to compare against the correct answer. The kid's ink is never replaced or live-translated.

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

- **Addition:** Carrying — With / Without / Random
- **Subtraction:**
  - Borrowing — With / Without / Random
  - **Allow negative answers** — Off (default) / On / Random
    - *Off:* bigger operand always on top
    - *On:* smaller operand may be on top, producing negative answers (e.g. `5 − 8 = −3`)
    - *Random:* mix of positive and negative answer problems
- **Multiplication:** Regrouping — With / Without / Random
- **Division:**
  - Answer type — Without remainders / With remainders / **With decimals** / Random
    - *Without remainders:* clean integer division (`12 ÷ 4 = 3`)
    - *With remainders:* (`13 ÷ 4 = 3 R 1`)
    - *With decimals:* answer has up to 3 decimal places (`15 ÷ 4 = 3.75`). Generator only picks problems with terminating decimals — no infinite repeating answers
    - *Random:* mix
- **Mix:** All four operations; each question randomly picks an operation; respects digit range. No regrouping/borrowing/remainder/negative/decimal constraints (mix stays simpler intentionally).

**Live summary line** at the bottom updates as user changes settings.

**Persistence:** Last-used settings per operation saved locally; restored on next entry.

**"Start practicing"** button at the bottom.

### 3. Practice

**Top bar:** Close (X), "Question X of Y" + progress bar, Timer if enabled, Help (?).

**Problem display:**
- Vertical math format for +, −, × (right-aligned monospace digits, operator on the left of second row, horizontal line below)
- Division layout auto-picked by digit count and answer type:
  - 1-digit ÷ 1-digit → horizontal: `8 ÷ 2 = [ ]`
  - 2+ digit dividend, integer answer → long division (bracket) layout with intermediate work zones
  - Decimal answer mode → horizontal layout with decimal-aware answer area (see below)

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

Example decimal layout for `15 ÷ 4 = ?`: