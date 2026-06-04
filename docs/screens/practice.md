# Practice screen (the question station)

**Route:** `app/practice.tsx`
**Purpose:** the core experience — answer each generated question by hand. One
question on screen at a time, with a writing workspace.

## Layout (top → bottom)

1. **Top bar** (`styles.topBar`):
   - **Close** (`✕`) → opens the leave-confirm dialog.
   - **Progress** — `practice.progress` text + a two-segment fill bar
     (`role=progressbar`) tinted with the operation accent.
   - **Timer** — `TimerDisplay` when the session is timed.
   - **Solve** — `sparkles-outline`, **dev-only** (`devPrefs.showSolveButton`,
     off in prod) → full auto-solve.
   - **Hint** — amber `bulb-outline` → `onHint` (`markHinted` + a single animated
     solve step).
2. **`QuestionWorkspace`** — the writing area (see below).
3. **Bottom bar** — a single primary button: **Next** (or **Finish** on the last
   question).
4. **`ConfirmDialog`** — "Leave practice?" when the user taps ✕.

## The workspace

`QuestionWorkspace` is a re-export of
`components/panels/OperationsPanel/workspace/OperationsWorkspace.tsx`. It owns:
- The **answer boxes** (per-digit), the **scratch "Worksheet"** canvas, and the
  on-pad writing surface (Skia ink), all on a notebook-grid background.
- Operation scaffolding: carry boxes, borrow arrows, multiplication partials,
  the **long-division draft grid** (with auto-scroll), bring-down animation.
- The **hand-cursor auto-solve / single-step hint** (animated writing, borrow
  sequencing) via `workspace/useSolver.ts`. Exposed through a ref handle:
  `solve()` and `solveStep()`.
- Auto-advance of focus between boxes after each digit.

Practice passes the session's ink + `onXInkChange` callbacks down, plus
`onUndo` / `onSolved` / `tone`.

## Data & state

- `usePracticeSession()` — the live session: `answerInk` / `scratchInk` /
  carry / partial / borrow / division ink + their updaters, `undoLastAction`
  (returns the reverted box so focus restores there), `markSolved`,
  `markHinted`, `finish`.
- `useRecognition()` — `recognizeAnswer`, run **at Finish** (and on Next via
  `judgeCurrentAnswer`), not per keystroke.
- `useTimer()` — countdown; time-up triggers finish.
- `useDevPreferences()` — gates the dev Solve button.

## Key behaviors

- **Recognition timing:** ink is judged when advancing/finishing, then
  success/error feedback sounds play. Results flow to the Score screen.
- **Hint:** one tap performs the next step in a distinct blue ink and auto-focuses
  the next box; the question is flagged "hint used" for Results.
- **Finish:** `finish(recognizeAnswer)` → `router.replace('/score')`.
- **Leave:** confirm → `router.dismissAll()` (progress is lost).

## i18n namespaces

`practice.*`, `hints.button`, `a11y.*`.

## Related

[operation-settings.md](operation-settings.md) (entry) ·
[results.md](results.md) (exit) · `hooks/usePracticeSession.tsx`,
`hooks/useRecognition.ts`, `hooks/useTimer.ts` · the `workspace/` cluster.
