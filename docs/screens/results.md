# Results screen (score)

**Route:** `app/score.tsx`
**Purpose:** show how the just-finished session went, and let the kid review any
question or play again.

## Guard

If there's no `session.results` (e.g. opened directly), it `Redirect`s to `/`.

## Layout (top → bottom)

1. **Fixed top** (`styles.topFixed`, stays put while the list scrolls):
   - Header `score.title`.
   - **Encouragement** line — `score.encouragement.{key}` where the key comes
     from `encouragementKey(final, total)`.
   - **Hero score** — big `final / total` in the operation accent.
   - **Three stat cards:** First try, **Final** (accented), Accuracy (`%`).
   - **Tagline** (`score.tagline`).
2. **Scrollable list** — one `QuestionResultRow` per result; tap → `/review/{i}`.
3. **Pinned footer** — **Try Again** (accent) and **Back Home** (secondary).

## Data & state

- `usePracticeSession()` → `session`, `start`, `reset`.
- `lib/scoring` → `countFirstTry`, `countFinal`, `scorePercent`,
  `encouragementKey`.

## Components

- `QuestionResultRow` (`components/domain`) — per-question result row: correct /
  wrong (coral) / **not-answered** (neutral grey) / **fixed** + **hint-used**
  chips.

## Key behaviors

- **Try Again** — `start(session.settings)` + `router.replace('/practice')`
  (same settings, fresh questions).
- **Back Home** — `reset()` + `router.dismissAll()`.
- **Tap a row** — opens the Review/Edit screen for that question.

## i18n namespaces

`score.*`.

## Related

- **Review/Edit** (`app/review/[index].tsx`) — reached from a result row; lets the
  kid re-answer a question and re-check it ("Check answer"); a corrected answer is
  marked **Fixed** and updates the Final score. (Its own screen; document here as
  the Results companion.)
- [practice.md](practice.md) (entry) · [history.md](history.md) (where finished
  sessions persist).
