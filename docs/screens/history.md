# History screens

Completed practice sessions, persisted locally (offline). Two routes: the list
and a per-session detail.

## List — `app/history/index.tsx`

**Purpose:** every finished session, most recent first.

**Layout:**
- Header `history.title`, back button.
- A `HistoryRow` `Card` per session → `/history/{session.id}`.
- **Clear all** (secondary) → a destructive `ConfirmDialog`.
- `EmptyState` (`history.empty` / `emptyHint`) when there are none; header-only
  skeleton while loading.

**`HistoryRow`** shows: operation badge (accent tile with `+ − × ÷` or shuffle),
operation name, when (`toLocaleString`) · duration (`history.duration`), and the
**first-try** + **final** scores.

**Data:** `useHistory()` → `{ sessions, loading, clearAll }` (from `historyStore`).

## Detail — `app/history/[id].tsx`

**Purpose:** every question of one past session.

**Layout:**
- Header `history.detailTitle`, back button.
- Summary: operation name + first-try · final scores.
- A `QuestionResultRow` per question — **digits only, no ink, not tappable**
  (history keeps the outcome, not the handwriting).
- `EmptyState` if the id isn't found.

**Data:** `useHistory()`, looked up by the `id` route param.

## Entry points

The History `Pill` in the [Operations](operations.md) footer, or any
`router.push('/history')`.

## i18n namespaces

`history.*`, `operations.*`, `common.*`.

## Related

`hooks/useHistory.ts`, `lib/storage` (`historyStore`),
`components/domain/QuestionResultRow.tsx` (shared with [Results](results.md)).
