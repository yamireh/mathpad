/**
 * Variety guarantees for the practice-question generators.
 *
 * The app owner reported that generated sets "feel non-unique" to a child:
 * division repeats the same divisor, and the clock repeats the same minute
 * value question after question. These tests pin down the anti-repeat
 * behaviour with a seeded RNG (fully deterministic — no flakiness) plus a few
 * many-seed sweeps for the statistical claims.
 */
import { generateSession } from '../lib/questionGenerator';
import { generateClockQuestions } from '../lib/clock/question';
import type {
  AdditionSettings,
  DivisionSettings,
  MixSettings,
  MultiplicationSettings,
  Question,
  SubtractionSettings,
} from '../types';
import type { ClockComplexity } from '../lib/clock/types';

/* -------------------------------------------------------------------------- */
/* Deterministic RNG (mulberry32) — same seed ⇒ same sequence, no flakiness.   */
/* -------------------------------------------------------------------------- */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

const timer = { enabled: false, durationMinutes: 5 } as const;

function additionSettings(over: Partial<AdditionSettings> = {}): AdditionSettings {
  return {
    operation: 'addition',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    carrying: 'random',
    decimals: 'off',
    ...over,
  };
}
function subtractionSettings(
  over: Partial<SubtractionSettings> = {},
): SubtractionSettings {
  return {
    operation: 'subtraction',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    borrowing: 'random',
    allowNegative: 'off',
    decimals: 'off',
    ...over,
  };
}
function multiplicationSettings(
  over: Partial<MultiplicationSettings> = {},
): MultiplicationSettings {
  return {
    operation: 'multiplication',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    regrouping: 'random',
    decimals: 'off',
    ...over,
  };
}
function divisionSettings(over: Partial<DivisionSettings> = {}): DivisionSettings {
  return {
    operation: 'division',
    digitCounts: [2, 3],
    questionCount: 20,
    timer,
    answerType: 'noRemainder',
    divisionType: 'long',
    dividendDigits: 3,
    divisorDigits: 2,
    ...over,
  };
}
const mixSettings = (over: Partial<MixSettings> = {}): MixSettings => ({
  operation: 'mix',
  digitCounts: [2, 3],
  questionCount: 20,
  timer,
  ...over,
});

/** Longest run of consecutive equal values in `xs`. */
function maxRunLength<T>(xs: T[], eq: (a: T, b: T) => boolean): number {
  let best = xs.length ? 1 : 0;
  let run = best;
  for (let i = 1; i < xs.length; i++) {
    run = eq(xs[i], xs[i - 1]) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Order-normalized signature of a problem (commutative-aware). */
function problemSig(q: Question): string {
  const commutative =
    q.operation === 'addition' || q.operation === 'multiplication';
  const ops = commutative ? [...q.operands].sort((a, b) => a - b) : q.operands;
  const dec = q.operandDecimals ? `d${q.operandDecimals.join(',')}` : '';
  return `${q.operation}|${ops.join('x')}|${dec}`;
}

/* -------------------------------------------------------------------------- */
/* Operations — no exact-duplicate problem when the space is large             */
/* -------------------------------------------------------------------------- */
describe('operations variety — no duplicate problems', () => {
  const cases: Array<[string, Parameters<typeof generateSession>[0]]> = [
    ['addition', additionSettings()],
    ['subtraction', subtractionSettings()],
    ['multiplication', multiplicationSettings()],
    ['division', divisionSettings({ answerType: 'random' })],
    ['mix', mixSettings()],
  ];
  for (const [name, settings] of cases) {
    it(`${name}: every problem in a set is distinct (order-normalized)`, () => {
      for (const seed of SEEDS) {
        const qs = generateSession(settings, mulberry32(seed));
        const sigs = qs.map(problemSig);
        expect(new Set(sigs).size).toBe(qs.length);
      }
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Operations — no back-to-back / three-in-a-row repeat of the same divisor    */
/* -------------------------------------------------------------------------- */
describe('operations variety — divisor anti-repeat (the reported bug)', () => {
  it('division: never repeats the same divisor back-to-back', () => {
    for (const seed of SEEDS) {
      const qs = generateSession(
        divisionSettings({ answerType: 'random' }),
        mulberry32(seed),
      );
      const divisors = qs.map((q) => q.operands[1]);
      // 2-digit divisors give ~90 choices for 20 questions, so an adjacent
      // repeat is always avoidable — the run of equal divisors must be 1.
      expect(maxRunLength(divisors, (a, b) => a === b)).toBe(1);
    }
  });

  it('division: uses a healthy spread of distinct divisors', () => {
    for (const seed of SEEDS) {
      const qs = generateSession(divisionSettings(), mulberry32(seed));
      const distinct = new Set(qs.map((q) => q.operands[1]));
      // With a large divisor space a 20-question set should feel varied.
      expect(distinct.size).toBeGreaterThanOrEqual(10);
    }
  });

  it('division: no three-in-a-row identical divisor even in a small divisor space', () => {
    // 1-digit divisors (2–9) are only 8 values, so exact-repeat spread is
    // limited — but adjacency must still never chain three the same.
    for (const seed of SEEDS) {
      const qs = generateSession(
        divisionSettings({ divisorDigits: 1, questionCount: 20 }),
        mulberry32(seed),
      );
      const divisors = qs.map((q) => q.operands[1]);
      expect(maxRunLength(divisors, (a, b) => a === b)).toBeLessThan(3);
      // adjacency is still avoided outright when there's room (8 ≥ 2)
      expect(maxRunLength(divisors, (a, b) => a === b)).toBe(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Operations — no back-to-back shared operand for +, −, ×                     */
/* -------------------------------------------------------------------------- */
describe('operations variety — operand anti-repeat', () => {
  const cases: Array<[string, Parameters<typeof generateSession>[0]]> = [
    ['addition', additionSettings()],
    ['subtraction', subtractionSettings()],
    ['multiplication', multiplicationSettings()],
  ];
  for (const [name, settings] of cases) {
    it(`${name}: consecutive questions share no operand (large space)`, () => {
      for (const seed of SEEDS) {
        const qs = generateSession(settings, mulberry32(seed));
        for (let i = 1; i < qs.length; i++) {
          const prev = new Set(qs[i - 1].operands);
          const shared = qs[i].operands.some((o) => prev.has(o));
          expect(shared).toBe(false);
        }
      }
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Operations — graceful degradation when the space is tiny (no hang/crash)    */
/* -------------------------------------------------------------------------- */
describe('operations variety — graceful degradation', () => {
  it('tiny space: returns exactly questionCount without hanging or throwing', () => {
    // 1-digit multiplication with no regrouping has only a handful of distinct
    // problems ({2×2, 2×3, 2×4, 3×3}), far fewer than the 20 requested — the
    // generator must degrade (allow repeats) rather than loop forever.
    const start = Date.now();
    const qs = generateSession(
      multiplicationSettings({
        digitCounts: [1],
        regrouping: 'without',
        questionCount: 20,
      }),
      mulberry32(1),
    );
    expect(qs).toHaveLength(20);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('impossible-then-clamped division still produces exactly questionCount', () => {
    const qs = generateSession(
      divisionSettings({
        dividendDigits: 1,
        divisorDigits: 2,
        answerType: 'noRemainder',
        questionCount: 20,
      }),
      mulberry32(2),
    );
    expect(qs).toHaveLength(20);
  });
});

/* -------------------------------------------------------------------------- */
/* Clock — minute-hand anti-repeat (the reported "45 for several in a row")    */
/* -------------------------------------------------------------------------- */
describe('clock variety — minute anti-repeat', () => {
  const steps: ClockComplexity[] = ['quarter', 'five', 'minute', 'any'];

  for (const step of steps) {
    it(`${step}: minute value never repeats back-to-back`, () => {
      for (const seed of SEEDS) {
        const qs = generateClockQuestions({
          count: 14,
          step,
          type: 'digital',
          skill: 'read',
          jump: 'hour',
          rng: mulberry32(seed),
        });
        const minutes = qs.map((q) => q.time.minute);
        expect(maxRunLength(minutes, (a, b) => a === b)).toBe(1);
      }
    });
  }

  it('quarter: a session spreads across the whole {0,15,30,45} step set', () => {
    for (const seed of SEEDS) {
      const qs = generateClockQuestions({
        count: 12,
        step: 'quarter',
        type: 'digital',
        skill: 'read',
        jump: 'hour',
        rng: mulberry32(seed),
      });
      const minutes = new Set(qs.map((q) => q.time.minute));
      // 12 questions over 4 minute values, with adjacency forbidden ⇒ every
      // value should appear.
      expect(minutes.size).toBe(4);
    }
  });

  it('still gives every question a distinct time (dedup invariant preserved)', () => {
    for (const step of ['quarter', 'five', 'minute'] as const) {
      for (const seed of SEEDS.slice(0, 10)) {
        const qs = generateClockQuestions({
          count: 12,
          step,
          type: 'digital',
          skill: 'read',
          jump: 'hour',
          rng: mulberry32(seed),
        });
        const keys = qs.map((q) => `${q.time.hour}:${q.time.minute}`);
        expect(new Set(keys).size).toBe(qs.length);
      }
    }
  });

  it('graceful: tiny quarter space with a big count returns exactly count, no hang', () => {
    const start = Date.now();
    const qs = generateClockQuestions({
      count: 40, // > 48 distinct quarter times is fine, but stress the loops
      step: 'quarter',
      type: 'digital',
      skill: 'read',
      jump: 'hour',
      rng: mulberry32(3),
    });
    expect(qs).toHaveLength(40);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
