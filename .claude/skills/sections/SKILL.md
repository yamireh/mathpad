---
name: sections
description: Use whenever you need to know what top-level sections MathPad has, what's live vs coming soon, and where each section's screens/routes live. Activate for tasks involving navigation, the Home screen, app scope, feature planning, or questions like "what does this app cover" / "where does X feature belong".
---

# MathPad — App Sections

MathPad is organized into top-level sections selectable from the **Home screen**. Each section is a distinct topic area with its own routes, settings, and practice flow.

## Section map

| Section | Status | One-liner | Route(s) |
|---|---|---|---|
| **Operations** | ✅ Live | Hand-written arithmetic practice with +, −, ×, ÷ — including scratch work (carrying, borrowing) and instant marking. | `app/operations.tsx`, `app/settings/[operation].tsx`, `app/practice.tsx` |
| **Clock** | 🔜 Coming Soon | Reading and working with analog/digital time. | `app/clock.tsx` |
| **Shapes** | 🔜 Coming Soon | Geometry — identifying, comparing, and reasoning about 2D/3D shapes. | `app/shapes.tsx` |
| **X/Y (Coordinates)** | 🔜 Coming Soon | Plotting and reading points on a coordinate plane. | `app/axis.tsx` |

## Operations — sub-topics (live)

| Topic | Accent | Notes |
|---|---|---|
| Addition | Blue `#3B82F6` | Carrying: with / without / random |
| Subtraction | Coral `#FF6F61` | Borrowing: with / without / random. Optional negative answers. |
| Multiplication | Purple `#8B5CF6` | Regrouping: with / without / random |
| Division | Teal `#14B8A6` | Without remainders / with remainders / with decimals / random |
| Mix | Neutral `#64748B` | Random op per question; simpler — no per-op flags |

Tokens live in `constants/design.ts` under `operationColors`.

## How sections appear in the app

- **Home screen** (`app/index.tsx`) shows the section grid. Tapping a card → that section's settings or main screen.
- Each "coming soon" section's route file exists as a stub. Don't delete them — they're placeholders for the planned features.
- Settings, History, and Score are *cross-cutting* screens, not sections — they apply to whichever section is active.

## Rules for working with sections

1. **Adding a new section?** Update this skill, add a route under `app/`, add a Home-screen card, and define an accent color in `constants/design.ts` if it needs one. Cross-cutting screens (history/score/review) should treat sections uniformly via the same `operation`/topic parameter shape.
2. **Building inside an existing section?** Stay within its route + domain folder. Don't bleed Operations logic into Clock, etc.
3. **"Coming soon" sections** should display a friendly placeholder, not crash or open a dev screen. If you're asked to wire one up, confirm scope against SPEC first — Clock/Shapes/X-Y are not in the v1 spec, so a new SPEC section needs to land first.
4. **Marketing copy / App Store description** must match this section list. If a section's status changes (Live ↔ Coming Soon), update this file in the same PR.

## What's NOT a section

- **Settings** — per-section configuration, not a section itself
- **History** — cross-section log of past sessions
- **Score** — end-of-session summary screen
- **Review** — per-question correction screen reached from Score

These are *flows*, not sections, and they apply across every section uniformly.
