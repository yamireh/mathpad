import {
  DEFAULT_WEEK_START,
  evaluateAwards,
  goalMet,
  localDateKey,
  makeKey,
  progressInWindow,
  windowFor,
  type RewardTarget,
  type SessionLike,
} from '../lib/rewards';

/** Local Date at a given local wall-clock time (TZ-independent in tests). */
const at = (y: number, m: number, d: number, h = 12): Date =>
  new Date(y, m - 1, d, h);
/** A session completed at a local wall-clock time. */
const session = (
  topic: string,
  date: Date,
  totalQuestions: number,
): SessionLike => ({ topic, completedAt: date.toISOString(), totalQuestions });

describe('windowFor', () => {
  it('daily → local midnight to next midnight', () => {
    const w = windowFor('daily', at(2026, 7, 20, 15));
    expect(w.start).toEqual(at(2026, 7, 20, 0));
    expect(w.end).toEqual(at(2026, 7, 21, 0));
    expect(w.key).toBe('daily:2026-07-20');
  });

  it('weekly (Monday default) snaps back to Monday', () => {
    // 2026-07-22 is a Wednesday → week starts Monday 2026-07-20.
    const w = windowFor('weekly', at(2026, 7, 22));
    expect(w.start).toEqual(at(2026, 7, 20, 0));
    expect(w.end).toEqual(at(2026, 7, 27, 0));
    expect(w.key).toBe('weekly:2026-07-20');
  });

  it('weekly respects a Sunday week start', () => {
    const w = windowFor('weekly', at(2026, 7, 22), 0);
    expect(w.start).toEqual(at(2026, 7, 19, 0)); // Sunday
    expect(w.end).toEqual(at(2026, 7, 26, 0));
  });

  it('monthly → first of month to first of next month', () => {
    const w = windowFor('monthly', at(2026, 7, 22));
    expect(w.start).toEqual(at(2026, 7, 1, 0));
    expect(w.end).toEqual(at(2026, 8, 1, 0));
    expect(w.key).toBe('monthly:2026-07-01');
  });

  it('DEFAULT_WEEK_START is Monday', () => {
    expect(DEFAULT_WEEK_START).toBe(1);
  });

  it('localDateKey / makeKey format', () => {
    expect(localDateKey(at(2026, 1, 5))).toBe('2026-01-05');
    expect(makeKey('weekly', at(2026, 7, 20, 0))).toBe('weekly:2026-07-20');
  });
});

describe('progressInWindow', () => {
  const w = windowFor('weekly', at(2026, 7, 22)); // Mon 20 → Mon 27

  it('sums totals and per-topic inside the window only', () => {
    const sessions = [
      session('addition', at(2026, 7, 20), 10),
      session('addition', at(2026, 7, 22), 5),
      session('subtraction', at(2026, 7, 23), 8),
      session('addition', at(2026, 7, 19), 99), // before window — excluded
      session('addition', at(2026, 7, 27), 99), // window end is exclusive
    ];
    const p = progressInWindow(sessions, w);
    expect(p.total).toBe(23);
    expect(p.byTopic).toEqual({ addition: 15, subtraction: 8 });
  });

  it('ignores unparseable dates', () => {
    const p = progressInWindow(
      [{ topic: 'addition', completedAt: 'nonsense', totalQuestions: 5 }],
      w,
    );
    expect(p.total).toBe(0);
  });
});

describe('goalMet', () => {
  it('requires the total to be reached', () => {
    expect(goalMet({ total: 20 }, { total: 20, byTopic: {} })).toBe(true);
    expect(goalMet({ total: 20 }, { total: 19, byTopic: {} })).toBe(false);
  });

  it('requires every per-topic minimum independently', () => {
    const goal = { total: 20, byTopic: { addition: 10, subtraction: 10 } };
    expect(
      goalMet(goal, { total: 20, byTopic: { addition: 10, subtraction: 10 } }),
    ).toBe(true);
    // total met, but subtraction short
    expect(
      goalMet(goal, { total: 20, byTopic: { addition: 15, subtraction: 5 } }),
    ).toBe(false);
  });

  it('a zero/empty total goal is never met', () => {
    expect(goalMet({ total: 0 }, { total: 100, byTopic: {} })).toBe(false);
  });
});

describe('evaluateAwards', () => {
  const weekly = (goal: RewardTarget['goal']): RewardTarget => ({
    period: 'weekly',
    goal,
    active: true,
  });
  const now = at(2026, 7, 24); // Friday, inside the Mon-20 week

  it('awards a star for a met window, once', () => {
    const sessions = [
      session('addition', at(2026, 7, 20), 120),
      session('subtraction', at(2026, 7, 22), 90),
    ];
    const awards = evaluateAwards({
      targets: [weekly({ total: 200 })],
      sessions,
      existingKeys: new Set(),
      now,
    });
    expect(awards).toHaveLength(1);
    expect(awards[0].windowKey).toBe('weekly:2026-07-20');
    expect(awards[0].progressSnapshot.total).toBe(210);
    expect(awards[0].goalSnapshot.total).toBe(200);
  });

  it('does not re-award a window already in the ledger (idempotent)', () => {
    const sessions = [session('addition', at(2026, 7, 20), 300)];
    const awards = evaluateAwards({
      targets: [weekly({ total: 200 })],
      sessions,
      existingKeys: new Set(['weekly:2026-07-20']),
      now,
    });
    expect(awards).toHaveLength(0);
  });

  it('awards multiple past windows caught up at once', () => {
    // Two different weeks, each meeting the goal; parent opens after both.
    const sessions = [
      session('addition', at(2026, 7, 13), 200), // week of Mon 13
      session('addition', at(2026, 7, 20), 200), // week of Mon 20
    ];
    const awards = evaluateAwards({
      targets: [weekly({ total: 200 })],
      sessions,
      existingKeys: new Set(),
      now,
    });
    expect(awards.map((a) => a.windowKey).sort()).toEqual([
      'weekly:2026-07-13',
      'weekly:2026-07-20',
    ]);
  });

  it('does not award a window that misses the goal', () => {
    const awards = evaluateAwards({
      targets: [weekly({ total: 200 })],
      sessions: [session('addition', at(2026, 7, 20), 199)],
      existingKeys: new Set(),
      now,
    });
    expect(awards).toHaveLength(0);
  });

  it('skips inactive targets', () => {
    const awards = evaluateAwards({
      targets: [{ ...weekly({ total: 10 }), active: false }],
      sessions: [session('addition', at(2026, 7, 20), 50)],
      existingKeys: new Set(),
      now,
    });
    expect(awards).toHaveLength(0);
  });

  it('enforces a per-topic breakdown before awarding', () => {
    const target = weekly({
      total: 200,
      byTopic: { addition: 50, subtraction: 50 },
    });
    // total ok but subtraction short → no award
    const short = evaluateAwards({
      targets: [target],
      sessions: [
        session('addition', at(2026, 7, 20), 190),
        session('subtraction', at(2026, 7, 21), 20),
      ],
      existingKeys: new Set(),
      now,
    });
    expect(short).toHaveLength(0);
    // breakdown satisfied → award
    const ok = evaluateAwards({
      targets: [target],
      sessions: [
        session('addition', at(2026, 7, 20), 100),
        session('subtraction', at(2026, 7, 21), 100),
      ],
      existingKeys: new Set(),
      now,
    });
    expect(ok).toHaveLength(1);
  });
});
