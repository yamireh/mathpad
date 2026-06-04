# MathPad — Screen Docs

One doc per main screen so changes don't require re-reading the whole tree.
**Keep these in sync when a screen changes.** SPEC.md remains the product source
of truth; these describe *what each screen is and how it's wired today*.

## Index

| Screen | Doc | Route(s) |
|---|---|---|
| Home (topic chooser) | [home.md](home.md) | `app/index.tsx` |
| Operations (operation chooser) | [operations.md](operations.md) | `app/operations.tsx` |
| Operation settings | [operation-settings.md](operation-settings.md) | `app/settings/[operation].tsx` |
| Practice (question station) | [practice.md](practice.md) | `app/practice.tsx` |
| Results (score) | [results.md](results.md) | `app/score.tsx` (+ `app/review/[index].tsx`) |
| Demo (How to solve) | [demo.md](demo.md) | `app/how-to/[operation].tsx` |
| History | [history.md](history.md) | `app/history/index.tsx`, `app/history/[id].tsx` |
| Coming-soon topics | [coming-soon.md](coming-soon.md) | `app/{shapes,clock,axis,patterns,money}.tsx` |

## Shared conventions (true for every screen)

- **Routing:** Expo Router, file-based under `app/`. Route files are usually
  thin — the real UI lives in `components/panels/` or `components/domain/`.
  Navigate with `useRouter()` (`router.push` / `replace` / `back` / `dismissAll`).
- **Providers** (mounted once in `app/_layout.tsx`, outermost → in):
  `SafeAreaProvider → PurchasesProvider → TipsProvider → PracticeSessionProvider
  → Stack` (`headerShown: false`). Any screen can read those contexts.
- **Layout primitives:** `ScreenContainer` (ui) wraps each screen (`scroll` /
  `padded` variants); `Header` (ui) renders the title + optional `left`/`right`
  slots (back button, action icons).
- **Styling:** only `constants/design.ts` tokens (`colors`, `spacing`, `radius`,
  `shadows`, `typography`, `operationColors`). No hard-coded values.
- **Copy:** all strings via `react-i18next` (`t('...')`), defined in
  `lib/i18n/locales/en.json`. Each doc lists the namespace(s) it uses.
- **Feedback:** `tapFeedback()` / `primaryFeedback()` from `lib/feedback` on
  taps; sounds are warm module-level players.
- **Tips/coach-marks** (`TipBubble`) are globally **disabled** right now via a
  `TIPS_ENABLED = false` flag in `components/ui/TipBubble.tsx`.
