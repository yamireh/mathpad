/**
 * Reward progress — how much of a goal a window's sessions satisfy.
 */
import type {
  RewardWindow,
  SessionLike,
  TargetGoal,
  WindowProgress,
} from './types';

/** Whether a session's completion falls inside a half-open window `[start, end)`. */
function inWindow(session: SessionLike, window: RewardWindow): boolean {
  const t = new Date(session.completedAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= window.start.getTime() && t < window.end.getTime();
}

/** Sum questions (total + per topic) for the sessions inside a window. */
export function progressInWindow(
  sessions: SessionLike[],
  window: RewardWindow,
): WindowProgress {
  const byTopic: Record<string, number> = {};
  let total = 0;
  for (const s of sessions) {
    if (!inWindow(s, window)) continue;
    const q = s.totalQuestions > 0 ? s.totalQuestions : 0;
    total += q;
    byTopic[s.topic] = (byTopic[s.topic] ?? 0) + q;
  }
  return { total, byTopic };
}

/**
 * Whether progress satisfies a goal: the total must be met AND every specified
 * per-topic minimum must be independently met. An empty/zero `total` goal is
 * treated as never met (a goal must ask for at least one question).
 */
export function goalMet(goal: TargetGoal, progress: WindowProgress): boolean {
  if (goal.total <= 0) return false;
  if (progress.total < goal.total) return false;
  if (goal.byTopic) {
    for (const [topic, need] of Object.entries(goal.byTopic)) {
      if (need <= 0) continue;
      if ((progress.byTopic[topic] ?? 0) < need) return false;
    }
  }
  return true;
}
