# Demo screen (How to solve)

**Route:** `app/how-to/[operation].tsx` (dynamic param `operation`)
**Purpose:** a worked-example walkthrough — shows a fixed question for the
operation and animates the solver through it. Reached from the amber lightbulb on
the [operation settings](operation-settings.md) header.

## Guard

`mix` has no demo → `Redirect` to `/`. (Hooks still run unconditionally above the
redirect; the demo falls back to an addition question internally to keep hook
order stable.)

## Layout (top → bottom)

1. **Header** — title `howTo.title` ({{operation}}), back button.
2. **`QuestionWorkspace`** — the same workspace as Practice, but driven by demo
   state (no real session), keyed by the question id, toned to the operation
   accent.
3. **Bottom bar** — **Watch how / Watch again** (`play` / `refresh`, secondary)
   and **Got it** (accent) → `router.back()`.

## The fixed questions

`lib/howTo/index.ts` → `howToQuestion(operation)` returns a stable example:
addition `367+458`, subtraction `502−367`, multiplication `47×36`, division
`512÷4` (long). Returns null for `mix`.

## Demo state

`hooks/useHowToDemo.ts` provides a **standalone** ink state (mirrors the session
reducers: answer / scratch / borrow / carry / partial / division draft+carry ink)
plus `reset()`. It returns `workspaceProps` spread onto `QuestionWorkspace`, so the
demo is isolated from the real practice session.

## Key behaviors

- **Watch:** `reset()` → set "played" → on the next frame call
  `workspaceRef.current?.solve()` (the animated hand-cursor auto-solve). The
  button label flips to "Watch again" after first play.
- **Got it:** `router.back()`.
- Coach-mark tips are globally disabled, so none appear over the demo.

## i18n namespaces

`howTo.*`, `operations.*`, `common.back`.

## Related

[operation-settings.md](operation-settings.md) (entry) · [practice.md](practice.md)
(same workspace) · `lib/howTo`, `hooks/useHowToDemo.ts`.
