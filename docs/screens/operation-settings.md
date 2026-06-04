# Operation settings screen

**Route:** `app/settings/[operation].tsx` (dynamic param `operation`)
**Purpose:** configure a practice session for one operation, then start it. The
form adapts to the chosen operation.

## Layout (top → bottom)

1. **Header** — title `settings.title` (operation name); **left** back button;
   **right** the amber **"How to solve"** lightbulb (skipped for `mix`).
2. **Scrollable form** of `Card` sections:
   - **Number of digits** — a from/to range; for **division** it's two selectors
     (`dividendDigits` / `divisorDigits`).
   - **Options** — operation-specific toggles: Borrowing, Carrying, Regrouping,
     Allow-negative, Decimals, **Division type** (in-a-row vs long), **Division
     answer type** (no-remainder / remainder / decimal / all), each often
     with-/without-/random modes.
   - **Number of questions**, **Timer** (inline switch + duration).
   - **"Your practice"** preview card summarizing the chosen settings.
3. **Start** — `settings.start` ("Start Practice") button.

## Data & state

- `useSettings(operation)` → `{ settings, update }`, persisted per operation
  (`settingsStore`). Renders a header-only skeleton until `settings` loads.
- `usePracticeSession().start(settings)` then `router.push('/practice')`.
- `usePurchases()` for the gate (below).

## Key behaviors

- **Purchase guard (deep-link safety):** if the operation is locked
  (`!isOperationUnlocked(operation, owned)` once purchases finished loading), the
  screen `Redirect`s to `/unlock`. The normal flow never reaches here for a
  locked op, but a deep link would.
- **How-to bulb:** amber `bulb` icon wrapped in `AttentionPulse` (always pulsing
  to draw attention) → `router.push('/how-to/${operation}')`. The push is
  **double-tap-guarded** (ignores a second tap within 600 ms) so it can't open
  the demo twice. Hidden for `mix`.
- **Start:** `primaryFeedback()`, `start(settings)`, navigate to Practice.

## i18n namespaces

`settings.*` (incl. `settings.divisionFormat.*`, `settings.divisionAnswer.*`,
`settings.mode.*`, etc.), `operations.*`, `howTo.button`, `common.back`.

## Related

[practice.md](practice.md) · [demo.md](demo.md) · `hooks/useSettings.ts` ·
`components/ui/AttentionPulse.tsx` · `lib/entitlement`.
