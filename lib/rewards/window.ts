/**
 * Reward window math — the period boundaries a goal is evaluated against.
 *
 * All boundaries are computed in **local time** (the parent app is the
 * authority; see `docs/parent-pro-targets-stars.md`). Keys use a local Y-M-D
 * start date, so they're stable regardless of how a date serialises to UTC.
 */
import type { RewardPeriod, RewardWindow } from './types';

/** Default week start: Monday. */
export const DEFAULT_WEEK_START = 1;

/** Local `YYYY-MM-DD` for a date (not UTC — avoids off-by-one at TZ edges). */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local midnight at the start of `date`'s day. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Add `days` calendar days (DST-safe via local Date construction). */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * The window containing `date` for a given period.
 * - daily   → local midnight → next midnight
 * - weekly  → most recent `weekStart` weekday ≤ date → +7 days
 * - monthly → first of the month → first of next month
 */
export function windowFor(
  period: RewardPeriod,
  date: Date,
  weekStart: number = DEFAULT_WEEK_START,
): RewardWindow {
  if (period === 'daily') {
    const start = startOfDay(date);
    return { start, end: addDays(start, 1), key: makeKey('daily', start) };
  }
  if (period === 'weekly') {
    const day = startOfDay(date);
    const offset = (day.getDay() - weekStart + 7) % 7;
    const start = addDays(day, -offset);
    return { start, end: addDays(start, 7), key: makeKey('weekly', start) };
  }
  // monthly
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end, key: makeKey('monthly', start) };
}

/** Stable idempotency key for a window: `${period}:${localYMD(start)}`. */
export function makeKey(period: RewardPeriod, start: Date): string {
  return `${period}:${localDateKey(start)}`;
}
