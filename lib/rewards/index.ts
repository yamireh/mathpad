/**
 * Parent Pro — Targets & Stars: pure, framework-free reward logic.
 *
 * Window math, per-window progress, and idempotent star evaluation. No Firebase,
 * no React — fully unit-testable. See `docs/parent-pro-targets-stars.md`.
 */
export type {
  RewardPeriod,
  TargetGoal,
  RewardTarget,
  SessionLike,
  RewardWindow,
  WindowProgress,
  RewardAward,
} from './types';
export { windowFor, makeKey, localDateKey, DEFAULT_WEEK_START } from './window';
export { progressInWindow, goalMet } from './progress';
export { evaluateAwards, type EvaluateInput } from './award';
