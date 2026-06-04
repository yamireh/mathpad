# Home screen (topic chooser)

**Route:** `app/index.tsx` → delegates to `components/panels/MainPanel/MainPanel.tsx`
**Purpose:** the landing screen — a hero greeting plus one card per top-level
topic (Operations + the coming-soon modules).

## Layout (top → bottom)

1. **Hero** — a blue (`operationColors.addition.accent`) rounded card: greeting
   (`home.greeting`) + subtitle (`home.subtitle`) on the left, the app abacus art
   (`assets/icon.png`) on the right.
2. **Topic grid** — a `TopicCard` for each entry in `TOPICS`.
3. **Support link** — a muted "Help & Support" row (`home.support`) →
   `router.push('/support')`.

## Topic list — single source of truth

`components/panels/MainPanel/topics.ts` exports `TOPICS: TopicDef[]`. Each topic
has `{ id, labelKey, descKey, icon, accent, tint, enabled, route }`. Current set:

| Topic | enabled | route | Lands on |
|---|---|---|---|
| operations | ✅ | `/operations` | [Operations screen](operations.md) |
| shapes | ❌ | `/shapes` | [Coming-soon](coming-soon.md) |
| clock | ❌ | `/clock` | Coming-soon |
| axis (Coordinates) | ❌ | `/axis` | Coming-soon |
| patterns | ❌ | `/patterns` | Coming-soon |
| money | ❌ | `/money` | Coming-soon |

**To add/enable a topic:** edit `topics.ts` and create `app/<id>.tsx`. The card
appears automatically; no other wiring.

## Components

- `TopicCard` (`components/panels/MainPanel/TopicCard.tsx`) — icon tile + label +
  one-line description; shows a **chevron** when `enabled`, or a **"Coming soon"**
  badge (`comingSoon.tag`) when not. Disabled cards still navigate (to the
  coming-soon placeholder).

## Behavior

- Every card taps through (`tapFeedback()` + `router.push(topic.route)`),
  including disabled ones — they just land on the shared ComingSoon screen.
- No gating here. (Operation-level purchase gating lives on the Operations
  screen, not Home.)

## i18n namespaces

`home.*`, `topics.*`, `topicsDesc.*`, `comingSoon.tag`.

## Related

[operations.md](operations.md) · [coming-soon.md](coming-soon.md) ·
`app/support.tsx` (support screen).
