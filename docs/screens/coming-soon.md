# Coming-soon topic screens

**Routes:** `app/shapes.tsx`, `app/clock.tsx`, `app/axis.tsx`,
`app/patterns.tsx`, `app/money.tsx`
**Purpose:** placeholder screens for topics that aren't built yet. Every
not-yet-shipped topic on [Home](home.md) lands here.

## How they're built

Each route file is a **thin wrapper** that renders the shared `ComingSoon` panel
with the topic's title + icon. Example (`app/shapes.tsx`):

```tsx
export default function ShapesRoute() {
  const { t } = useTranslation();
  return <ComingSoon title={t('topics.shapes')} iconName="shapes-outline" />;
}
```

The five wrappers are identical except for `title` and `iconName`:

| Route | title key | icon |
|---|---|---|
| `/shapes` | `topics.shapes` | `shapes-outline` |
| `/clock` | `topics.clock` | `time-outline` |
| `/axis` | `topics.axis` | `analytics-outline` |
| `/patterns` | `topics.patterns` | `extension-puzzle-outline` |
| `/money` | `topics.money` | `cash-outline` |

## The shared panel

`components/panels/shared/ComingSoon.tsx` — Header (back) + a centered column:
a muted icon, the `comingSoon.headline`, and the `comingSoon.body` message.
Keeping it shared means every placeholder looks the same.

## Turning a topic "live"

1. Flip `enabled: true` for the topic in
   `components/panels/MainPanel/topics.ts` (removes the "Coming soon" badge on
   Home).
2. Replace the route screen's `ComingSoon` with the real panel for that topic.

## i18n namespaces

`topics.*`, `comingSoon.headline`, `comingSoon.body`, `common.back`.

## Related

[home.md](home.md) (where these are reached) · `topics.ts` (the `enabled` flags).
