/**
 * Parent Pro — Targets & Stars: shared pure types.
 *
 * Framework-free. `topic` is the same key the dashboard groups sessions by
 * (`'addition' | 'subtraction' | … | 'clock'`), kept as a plain string here so
 * this module never depends on the operation union.
 */

/** How often a goal resets. */
export type RewardPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * A practice goal: a required total question count, plus optional per-topic
 * minimums (each topic must independently reach its count).
 */
export interface TargetGoal {
  total: number;
  byTopic?: Record<string, number>;
}

/** A goal a parent set for a child, evaluated once per period window. */
export interface RewardTarget {
  period: RewardPeriod;
  goal: TargetGoal;
  /** Week start day for weekly windows (0=Sun … 6=Sat). Defaults to Monday. */
  weekStart?: number;
  /** Inactive targets are ignored by evaluation. */
  active: boolean;
}

/** The minimum a session contributes to progress — decoupled from Firestore. */
export interface SessionLike {
  topic: string;
  /** ISO timestamp of completion. */
  completedAt: string;
  totalQuestions: number;
}

/** A half-open time window `[start, end)` and its stable idempotency key. */
export interface RewardWindow {
  start: Date;
  end: Date;
  /** e.g. `weekly:2026-07-20` — stable across timezones (local Y-M-D). */
  key: string;
}

/** Questions done inside a window, in total and per topic. */
export interface WindowProgress {
  total: number;
  byTopic: Record<string, number>;
}

/** One star to grant: everything the Firestore layer needs to write it. */
export interface RewardAward {
  period: RewardPeriod;
  /** The window's idempotency key (= `RewardWindow.key`). */
  windowKey: string;
  windowStart: Date;
  windowEnd: Date;
  /** Goal + progress captured at award time, so later edits can't retro-change it. */
  goalSnapshot: TargetGoal;
  progressSnapshot: WindowProgress;
}
