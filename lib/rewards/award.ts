/**
 * Reward evaluation — decide which stars to grant, idempotently.
 *
 * Parent-authoritative and pure: given a child's active targets, their sessions,
 * and the set of window keys already awarded, return the awards to create. Only
 * windows that actually had activity are considered (a goal needs > 0 questions,
 * so an empty window can never qualify) — which bounds the work to the periods
 * the kid practised in.
 */
import { goalMet, progressInWindow } from './progress';
import type { RewardAward, RewardTarget, SessionLike } from './types';
import { windowFor } from './window';

export interface EvaluateInput {
  targets: RewardTarget[];
  sessions: SessionLike[];
  /** Window keys already awarded (from the `awards` ledger) — never re-awarded. */
  existingKeys: ReadonlySet<string>;
  /** Evaluation time; windows starting after `now` are skipped. */
  now: Date;
}

/**
 * Stars to grant now: for each active target, the distinct windows its sessions
 * fall into that (a) haven't been awarded yet and (b) meet the goal. Deduped by
 * window key across the run, so the same window is never returned twice.
 */
export function evaluateAwards(input: EvaluateInput): RewardAward[] {
  const { targets, sessions, existingKeys, now } = input;
  const awards: RewardAward[] = [];
  const grantedThisRun = new Set<string>();

  for (const target of targets) {
    if (!target.active) continue;

    // Distinct candidate windows = the windows the kid's sessions land in.
    const windows = new Map<string, ReturnType<typeof windowFor>>();
    for (const s of sessions) {
      const t = new Date(s.completedAt);
      if (Number.isNaN(t.getTime())) continue;
      const w = windowFor(target.period, t, target.weekStart);
      if (w.start.getTime() > now.getTime()) continue; // future window — skip
      windows.set(w.key, w);
    }

    for (const window of windows.values()) {
      if (existingKeys.has(window.key) || grantedThisRun.has(window.key)) {
        continue;
      }
      const progress = progressInWindow(sessions, window);
      if (!goalMet(target.goal, progress)) continue;
      grantedThisRun.add(window.key);
      awards.push({
        period: target.period,
        windowKey: window.key,
        windowStart: window.start,
        windowEnd: window.end,
        goalSnapshot: {
          total: target.goal.total,
          ...(target.goal.byTopic ? { byTopic: { ...target.goal.byTopic } } : {}),
        },
        progressSnapshot: { total: progress.total, byTopic: { ...progress.byTopic } },
      });
    }
  }

  return awards;
}
