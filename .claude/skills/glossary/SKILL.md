---
name: glossary
description: Shared vocabulary for MathPad UI elements and supporting features. Use whenever the user references a feature by its conversational name (solve, undo, clear all, touch pad, next, topic settings, results, carrying boxes, answer boxes, draft boxes, etc.) so you can jump straight to the right file without reverse-engineering. Activate any time the user names a UI element informally and asks you to modify or inspect it.
---

# MathPad — UI & Feature Glossary

This is the **conversational vocabulary** the user uses for MathPad's UI elements and supporting features. When the user says any of these names, treat it as a direct reference to the canonical component(s) and file(s) listed here. **Do not re-search the codebase** for what a "carrying box" or "answer pad" means — it's defined here.

## Quick-reference table

| User says | Canonical name | File(s) | What it is |
|---|---|---|---|
| **Solve** / "auto-solve" | Solver | `components/domain/workspace/useSolver.ts` + Solve button in `app/practice.tsx` (gated by `devPrefs.showSolveButton`) | Hook + button that auto-fills the correct answer into the Answer Boxes. **Anti-cheat:** invoking it flags the question (`SessionData.solvedQuestions` via `markSolved` in `usePracticeSession`); at Finish, that question is downgraded from `'correct_first_try'` → `'fixed'` so it shows the Fixed badge on Results and is excluded from the first-try score. The flag is set synchronously at solve() invocation — cancelling the animation does not dodge it. |
| **Undo** | Undo action | `ScratchToolbar.onUndo` (scratch area) · `AnswerPad` undo button (answer pad) · `ScratchCanvas.undo()` handle | Removes the last stroke. Scoped to whichever surface is active. |
| **Clear all** | Clear All action | `AnswerPad.onClearAll` · `ScratchToolbar.onClear` · `OperationsWorkspace` (orchestrates) · `CompactBody` / `DivisionBody` | Wipes every answer box (or every scratch stroke, depending on which surface is active). |
| **Touch pad** (writing pad — kid's input surface for digits) | **Answer Pad** | `components/domain/AnswerPad.tsx` · hosted by `components/domain/workspace/PadRegion.tsx` | The bottom-of-screen writing pad. Active when an Answer Box is selected; strokes captured here flow into the box. |
| **Touch pad** (scratch / free-draw area) | **Scratch Canvas** | `components/domain/ScratchCanvas.tsx` | The free-form drawing area for showing work (borrowing, carrying notation, doodles). Separate from the Answer Pad. |
| **Next** | Next button | `t('next')` in `lib/i18n/locales/en.json` · wired through `OperationsWorkspace.tsx` (also has `advanceTimerRef` for auto-advance) | Manual "go to next question" button. Auto-advance timer also exists for after a correct answer is locked in. |
| **Finish** | Finish button | `t('finish')` · `OperationsWorkspace.tsx` | Ends the practice session and triggers scoring → navigates to the Results screen. |
| **Topic settings** | Settings screen (per operation) | `app/settings/[operation].tsx` | Per-section configuration: digit range, # of questions, timer, carrying/borrowing/regrouping/remainder modes. |
| **Results** / "score screen" | Score screen | `app/score.tsx` + row component `components/domain/QuestionResultRow.tsx` | End-of-session summary listing every question, the kid's answer, and the correct answer. |
| **Carrying boxes** (also "carry boxes") | **CarryBox** | `components/domain/CarryBox.tsx` | The small digit slot above a column for a carried digit. Used by addition/multiplication (carry row above the columns / times-carry above op1) and by **long division** (divisor-carry boxes above a multi-digit divisor for the active quotient step, ids `dcarry-{step}-{col}`, rendered in `components/domain/problem/DivisionProblem.tsx`). **No carry box is drawn above a leading answer column that only holds a final carry-out** (e.g. the `1` in `70 + 60 = 130`) — the kid writes that digit straight into the answer. Controlled by `leadingCarrySkip` (`workspace/multiOperand.ts`): `CarryRow`'s `leadingSkip` prop hides the box and `additionCarries` drops it from auto-advance. |
| **Borrow** (subtraction's analogue of carry) | **BorrowArrow** + borrow utilities | `components/domain/BorrowArrow.tsx` · `components/domain/borrow.ts` (`computeBorrowDisplay`, `needsBorrow`) | The animated `-1` / `+10` arrow + cross-out/reduced-value that visualizes borrowing across columns. Used by Subtraction (top operand) **and long division**: each step's subtraction minuend is tap-to-borrow — the dividend chunk for step 0, and locked difference rows for later steps. Per-step minuends from `longDivisionStepMinuends` (`layout.ts`); marks in `divisionBorrowMarks` (`usePracticeSession`). |
| **Answer boxes** | **AnswerBox** (single) · **AnswerArea** (group) | `components/domain/AnswerBox.tsx` · `components/domain/AnswerArea.tsx` | The cells where the recognized digit lands. One AnswerBox per digit; AnswerArea is the group container. **Live recognition (practice only):** when the kid pauses on a final-answer digit box, `OperationsWorkspace.commitAnswerBox` (pure helper `workspace/commitCell.ts` → `recognizeAnswerCell`) recognizes that one box on the auto-advance tick and swaps the raw ink for a clean `digitInk` glyph; unreadable ink is cleared and a `NoticeDialog` "couldn't read that" prompt shows (`t('practice.invalidTitle')`, one "Got it" button); two digits in one box show a "one digit per box" prompt (`t('practice.multiTitle')`, detected via the recognizer's `raw` in `commitCell.ts`). Recognition fires on the `ADVANCE_DELAY_MS` (~600ms) idle tick so two-stroke digits aren't cut off. Off during review's "Show errors" (errorMarks set). The sign box and all working cells (carry/borrow/partial/draft) stay as ink until Finish. |
| **Answer rows** (per-question final-answer layout variants) | Direct / Decimal / Remainder / Signed rows | `DirectAnswerRow.tsx` · `DecimalAnswerRow.tsx` · `RemainderAnswerRow.tsx` · `SignedAnswerRow.tsx` (all in `components/domain/`) | Different answer layouts depending on operation mode (horizontal division, decimals, remainders, negative answers). |
| **Draft boxes** | **Division Draft Grid** | `components/domain/DivisionDraftGrid.tsx` | The intermediate-work cells inside the long-division bracket layout (where the kid writes partial products and remainders). |
| **Problem display** | ProblemDisplay (dispatcher) + per-operation components | `components/domain/problem/` — `ProblemDisplay.tsx` (dispatches by layout/operation), `AdditionProblem.tsx`, `SubtractionProblem.tsx`, `MultiplicationProblem.tsx`, `DivisionProblem.tsx` (long + row), `shared.tsx` (`DigitCells`, `CarryRow`) | The top half — operands stacked, operator on the left, horizontal line under them. One component per operation; the dispatcher picks which to render. |
| **Workspace** | QuestionWorkspace + workspace/ | `components/domain/QuestionWorkspace.tsx` · `components/domain/workspace/` | The whole practice-screen layout containing problem display + answer boxes + pad/canvas. |
| **Main panel** / **Home grid** | MainPanel | `components/panels/MainPanel/MainPanel.tsx` · `TopicCard.tsx` · `topics.ts` | The Home screen with the section cards (Operations / Clock / Shapes / Axis). |
| **Operations panel** | OperationsPanel | `components/panels/OperationsPanel/OperationsPanel.tsx` · `workspace/{Addition,Subtraction,Multiplication,Division}Panel.tsx` | The container for the four operation flows. |
| **Coming soon screens** | ComingSoon panel | `components/panels/shared/ComingSoon.tsx` | Placeholder UI for Clock / Shapes / Axis sections. |
| **Pen / Eraser tool** | ScratchTool | `ScratchCanvas.tsx` (type `ScratchTool = 'pen' \| 'eraser'`) | Toggle on the scratch surface. |
| **Tip bubble** | TipBubble | `components/ui/TipBubble.tsx` | Floating hint pointing to a UI element (e.g. "Tap here when done"). |

## Disambiguation — when the user says "pad"

There are **two distinct writing surfaces** that both look like a "pad":

- **Answer Pad** (`AnswerPad.tsx`) — the digit-input pad at the bottom of the screen. Active only when an Answer Box is selected. Strokes here flow into the currently-selected Answer Box and get recognized as digits.
- **Scratch Canvas** (`ScratchCanvas.tsx`) — the free-draw surface for the kid's scratch work (borrowing notation, carry digits, doodles). Never recognized as digits; purely visual.

**When the user just says "touch pad" or "the pad":** ask which one if it's ambiguous from context. Default to **Answer Pad** if the user is talking about writing answers, **Scratch Canvas** if they're talking about scratch work or showing work.

## Disambiguation — when the user says "next"

There are two "next" mechanisms in `OperationsWorkspace.tsx`:

- **Next button** (`t('next')`) — a manually-tappable button shown after the answer is filled.
- **Auto-advance timer** (`advanceTimerRef`) — auto-fires "Next" after a correct, locked-in answer.

If the user says "the next button is too slow," they probably mean the auto-advance timer delay. If they say "the next button is wrong," they probably mean the button label/style/wiring.

## Rules

1. **Use these names back to the user.** When summarizing or asking follow-ups, say "the Answer Pad" / "the Scratch Canvas" / "the Carry Box" — never invented synonyms.
2. **Match user vocabulary to a row in the table before searching files.** If you can't find a match here, ask the user which element they mean — don't guess.
3. **If you add or rename a component**, update this skill in the same change so the vocabulary stays accurate.
4. **Component file references in this table may drift.** If a path here no longer matches what's in the repo, trust the repo and update this file.
