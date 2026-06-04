# Operations screen (operation chooser)

**Route:** `app/operations.tsx` → delegates to
`components/panels/OperationsPanel/OperationsPanel.tsx`
**Purpose:** choose which operation to practice. Lists the five operation cards
and applies the **purchase gate**.

## Layout

1. **Header** — title `topics.operations`, back button.
2. **Grid** — an `OperationCard` for each of `OPERATIONS = ['addition',
   'subtraction', 'multiplication', 'division', 'mix']`.
3. **Footer** — a History `Pill` → `/history`. Plus, in `__DEV__` only, a
   "DEV: locked / owned" pill that toggles the entitlement for testing.

## Purchase gating (V1 pricing)

- `usePurchases()` gives `owned`; `isOperationUnlocked(op, owned)`
  (`lib/entitlement`) decides each card. **Addition is always free**;
  Subtraction / Multiplication / Division / Mix need the **$9.99 Operations
  bundle**.
- A locked card shows a **lock** (via `OperationCard`'s `locked` prop) and, on
  tap, routes to **`/unlock`** instead of settings. Unlocked cards route to
  `/settings/{operation}`.
- See [the unlock screen](#related) for the store surface.

## Components

- `OperationCard` (`components/domain/OperationCard.tsx`) — accent symbol tile
  (`+ − × ÷`, shuffle for Mix), label + description, and a chevron (unlocked) or
  lock icon (locked).

## Behavior

- Tap (`tapFeedback()`): locked → `router.push('/unlock')`; else →
  `router.push('/settings/${operation}')`.
- Locked cards get an accessibility label via `unlock.lockedCard`.

## i18n namespaces

`topics.operations`, `operations.*`, `operationsDesc.*`, `unlock.lockedCard`,
`home.history`.

## Related

[operation-settings.md](operation-settings.md) · `app/unlock.tsx` (store /
"Unlock all operations — $9.99" + Restore) · [history.md](history.md) ·
`lib/entitlement`, `hooks/usePurchases.tsx`.
