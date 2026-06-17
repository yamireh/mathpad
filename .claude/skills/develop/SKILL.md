---
name: develop
description: Use when designing, building, or refactoring any component, screen, hook, or feature in MathPad. Enforces project folder layout, design-token usage, reusable-primitive reuse, and SPEC.md compliance. Activate for tasks like "build a new screen", "add a component", "refactor X", "implement feature Y", "design a new dialog/card/button".
---

# MathPad — Development Practices

Apply these rules whenever you design, build, or refactor anything in this project. They reflect the existing conventions in the codebase, not generic React Native advice. **Read the relevant files before writing new ones** — the patterns here are already in place and must be matched.

## 1. SPEC.md is the only source of truth

- Before designing anything user-facing, re-read the relevant section of `SPEC.md`.
- If a request conflicts with SPEC, flag it and ask — do not silently diverge.
- The recognition POC at `~/mathpad-recognition-test/` is NOT a design reference. Only `modules/digital-ink` (the ML Kit bridge) is reused from it.

## 2. Folder layout — put new code in the right place

| Where | What goes here | Examples |
|---|---|---|
| `app/` | Expo Router screens only. File-based routing, `_layout.tsx` for layouts, `[param].tsx` for dynamic routes. | `app/practice.tsx`, `app/settings/[operation].tsx` |
| `components/ui/` | **Generic, presentation-only primitives.** Design-token driven, MathPad-agnostic, no business logic, no domain types. | `Button`, `Card`, `Chip`, `Pill`, `IconButton`, `Header`, `ScreenContainer` |
| `components/domain/` | MathPad-specific business UI — knows about operations, digits, ink, scratch work. | `AnswerBox`, `ProblemDisplay`, `CarryBox`, `BorrowArrow`, `ScratchCanvas`, `QuestionWorkspace` |
| `components/domain/<feature>/` | Tight clusters of domain components/utilities for one feature. | `components/domain/workspace/` |
| `components/panels/` | Bigger composite layouts assembling many domain components. | `MainPanel`, `OperationsPanel` |
| `hooks/` | Custom React hooks. Stateful, may touch storage or RN APIs. No JSX. | `usePracticeSession`, `useTimer`, `useHistory`, `useRecognition` |
| `lib/` | **Pure logic, zero React.** No imports of `react`, `react-native`, or any component. | `questionGenerator`, `scoring`, `solver`, `storage`, `recognition`, `feedback`, `i18n` |
| `constants/design.ts` | Design tokens — colors, spacing, radii, shadows, typography, motion. | — |
| `modules/` | Native modules (Expo modules). Touch only when bridging to native code. | `digital-ink` |
| `types/` | Shared TS types used across multiple folders. | — |

**Rule of thumb:** if a component is generic enough that another app could use it, it belongs in `components/ui/`. If it knows the word "operation," "digit," "carry," or "borrow," it belongs in `components/domain/`. If it never imports React, it belongs in `lib/`.

## 3. Reusable primitives — extend before reinventing

Before creating any new visual element, check `components/ui/index.ts`. The current primitives are:

`Button` · `Card` · `Chip` · `ConfirmDialog` · `EmptyState` · `Header` · `IconButton` · `Pill` · `RadioRow` · `ScreenContainer` · `TipBubble`

**If you need something similar:**
1. First — can you use the existing primitive with different props? Do that.
2. Second — does the primitive need a new variant or prop? Add it there; don't fork.
3. Third — only create a new primitive if the new thing is genuinely orthogonal to all existing ones.

Never duplicate styling or behavior that's already in a UI primitive. Composing them is preferred over restyling RN's raw `View`/`Pressable`.

## 4. Design tokens — no hard-coded values

All colors, spacing, radii, shadows, typography, and motion live in `constants/design.ts`. **Never hard-code:**

- ❌ `color: '#FFFFFF'` → ✅ `color: colors.surface`
- ❌ `padding: 16` → ✅ `padding: spacing.md`
- ❌ `borderRadius: 12` → ✅ `borderRadius: radius.md`
- ❌ Per-operation `#3B82F6` → ✅ `operationColors.addition.accent`

If a value isn't in `design.ts` but you need it consistently, **add it to `design.ts` first** and import. Don't introduce magic numbers.

## 5. Component contract

Every new component file follows the same shape:

```tsx
import { type ReactNode } from 'react';
import { /* RN imports */ } from 'react-native';
import { colors, spacing, radius } from '../../constants/design';

export interface FooProps {
  /** Brief JSDoc per prop. */
  label: string;
  onPress?: () => void;
  // ...
}

/** One-line description of what this component is. */
export function Foo({ label, onPress }: FooProps) {
  // body
}

const styles = StyleSheet.create({ /* ... */ });
```

Rules:

- **Named exports only.** No `export default`. (`export function Foo`, `export interface FooProps`.)
- **Export the props type** alongside the component. Re-export both from the folder's `index.ts`.
- **JSDoc on the component** — one sentence describing what it is. JSDoc on non-obvious props.
- **Functional components only.** No class components.
- **`Pressable` over `TouchableOpacity`** — matches existing primitives.
- **Accessibility:** `accessibilityRole` + `accessibilityLabel` on every interactive element. Pass through from parent if needed.
- **StyleSheet at the bottom**, `StyleSheet.create({ ... })`. No inline style objects except for dynamic values (e.g. `[styles.box, { width }]`).
- **No business logic in components.** Pull pure logic into `lib/`, stateful logic into a hook, leave the component as presentation + wiring.

## 6. Hooks vs lib vs components — strict separation

- **`lib/` modules** must be pure TypeScript — no React, no React Native, no Expo modules. Testable with plain Jest.
- **`hooks/`** wrap stateful or side-effecting logic (storage, timers, recognition). They return data + callbacks; they don't render JSX.
- **Components** consume hooks and call `lib/` functions. They never read AsyncStorage, parse problems, or score answers directly.

When in doubt: "could I unit-test this without a React renderer?" → if yes, it goes in `lib/`.

## 7. Update barrel exports

After adding a new component or hook, re-export it from the folder's `index.ts`:

- New UI primitive → add to `components/ui/index.ts`
- New domain component → add to `components/domain/index.ts`
- New hook → add to `hooks/index.ts`

Consumers should `import { Foo } from '@/components/ui'` (or the relative path), never reach into the file directly.

## 8. Platform target — Expo SDK 54, iOS first

- This project is pinned to **Expo SDK 54**. Before using any Expo API, verify against `https://docs.expo.dev/versions/v54.0.0/`. APIs and config keys have shifted across recent SDKs — do not trust training data.
- iOS (iPad + iPhone) is the first-class target. Android comes later from the same codebase. Don't introduce iOS-only APIs without flagging the Android impact.
- The app is **fully offline.** No network calls, no analytics, no remote config. Never add a fetch or telemetry hook.

## 9. Don't over-engineer

- A bug fix doesn't need surrounding cleanup or new abstractions.
- A one-shot operation doesn't need a helper hook.
- Three similar lines is better than a premature abstraction.
- Don't add error handling for impossible cases. Trust internal code.
- Don't add comments that restate the code. Only comment WHY when it's non-obvious.

## 10. Before reporting "done"

- **Type-check passes:** the change compiles (`tsc --noEmit` clean if you ran it; otherwise the editor isn't red).
- **Tests pass** if you touched code in `lib/` (there are Jest tests under `__tests__/`).
- **Did you actually see the change?** For UI changes, run the app — type-checking is not the same as a working feature. If you can't run the app in this session, say so explicitly rather than claiming success.

---

**When this skill activates** and the user asks for any non-trivial UI or feature work: pause, read the directly relevant existing file(s), and confirm your plan respects sections 2–5 before writing code.
