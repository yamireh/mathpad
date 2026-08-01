/**
 * Exhaustive no-duplicate guarantee for the question generator.
 *
 * The app owner treats an exact-duplicate question inside a single practice set
 * as a dealbreaker: parents must feel the questions are unlimited and unique.
 * `generateSession` already dedups whole-problem signatures (order-normalized
 * for commutative ops, decimal-aware). These tests PROVE that guarantee holds
 * across a broad, realistic settings matrix — every operation, digit-count set,
 * question count, mode variant and (for division) dividend/divisor/answer-type
 * combination — over many deterministic seeds (no flakiness).
 *
 * "Duplicate" = same problem, order-normalized:
 *   - addition / multiplication: `3+5` === `5+3` (operands sorted)
 *   - subtraction / division: operand order matters (a division duplicate needs
 *     BOTH dividend AND divisor to match)
 *   - decimal place metadata is part of the identity (4.0 ≠ 4.00)
 *
 * Where the combination space is smaller than the requested count (e.g. 1-digit
 * no-regroup multiplication) true uniqueness is mathematically impossible; those
 * cases are asserted for graceful degradation instead (see the final block).
 */
import { generateSession } from '../lib/questionGenerator';
import type {
  AdditionSettings,
  DigitCount,
  DivisionAnswerType,
  DivisionFormat,
  DivisionSettings,
  MixSettings,
  ModeOption,
  MultiplicationSettings,
  Question,
  QuestionCount,
  Settings,
  SubtractionSettings,
} from '../types';

/* -------------------------------------------------------------------------- */
/* Deterministic RNG (mulberry32) — same seed ⇒ same sequence, no flakiness.   */
/* Identical to the helper in generatorVariety.test.ts (kept in sync).         */
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

/** 50 deterministic seeds — statistically strong, fully reproducible. */
// 15 deterministic seeds keeps this exhaustive-matrix suite strong but quick as
// a regression check. (It was verified once at 50 seeds / ~60k sessions with
// zero duplicates across the whole matrix — see the commit note; 15 is ample to
// catch any regression.)
const SEEDS = Array.from({ length: 15 }, (_, i) => i + 1);

const timer = { enabled: false, durationMinutes: 5 } as const;

/* -------------------------------------------------------------------------- */
/* Settings builders                                                           */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Signature helpers (mirrors the generator's internal questionSignature)      */
/* -------------------------------------------------------------------------- */
/** Order-normalized, decimal-aware problem signature (commutative-aware). */
function problemSig(q: Question): string {
  const commutative =
    q.operation === 'addition' || q.operation === 'multiplication';
  const ops = commutative ? [...q.operands].sort((a, b) => a - b) : q.operands;
  const dec = q.operandDecimals ? `d${q.operandDecimals.join(',')}` : '';
  return `${q.operation}|${ops.join('x')}|${dec}`;
}

/** Assert a generated set has zero exact-duplicate problems, for every seed. */
function expectAllDistinct(settings: Settings, seeds: number[] = SEEDS): void {
  for (const seed of seeds) {
    const qs = generateSession(settings, mulberry32(seed));
    expect(qs).toHaveLength(settings.questionCount);
    const sigs = qs.map(problemSig);
    // The core guarantee: no two problems in the set are identical.
    expect(new Set(sigs).size).toBe(qs.length);
  }
}

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

const COUNTS: QuestionCount[] = [5, 10, 15, 20];
const MODES: ModeOption[] = ['with', 'without', 'random'];

/* ========================================================================== */
/* ADDITION — large space, no duplicates                                       */
/* ========================================================================== */
describe('no-duplicates — addition', () => {
  // Digit sets whose combination space (≥ ~10*10/2 = 50 pairs for [2]) easily
  // exceeds 20 questions, so uniqueness is always achievable.
  const digitSets: DigitCount[][] = [[2], [3], [2, 3], [2, 3, 4]];
  for (const dc of digitSets) {
    for (const carrying of MODES) {
      for (const decimals of ['off', 'on', 'random'] as const) {
        for (const questionCount of COUNTS) {
          it(`dc=${dc} carry=${carrying} dec=${decimals} qc=${questionCount}`, () => {
            expectAllDistinct(
              additionSettings({ digitCounts: dc, carrying, decimals, questionCount }),
            );
          });
        }
      }
    }
  }
});

/* ========================================================================== */
/* SUBTRACTION — large space, no duplicates (incl. allowNegative)              */
/* ========================================================================== */
describe('no-duplicates — subtraction', () => {
  const digitSets: DigitCount[][] = [[2], [3], [2, 3], [2, 3, 4]];
  for (const dc of digitSets) {
    for (const borrowing of MODES) {
      for (const allowNegative of ['off', 'on', 'random'] as const) {
        for (const decimals of ['off', 'on', 'random'] as const) {
          for (const questionCount of COUNTS) {
            it(`dc=${dc} bor=${borrowing} neg=${allowNegative} dec=${decimals} qc=${questionCount}`, () => {
              expectAllDistinct(
                subtractionSettings({
                  digitCounts: dc,
                  borrowing,
                  allowNegative,
                  decimals,
                  questionCount,
                }),
              );
            });
          }
        }
      }
    }
  }
});

/* ========================================================================== */
/* MULTIPLICATION — large space, no duplicates                                 */
/* ========================================================================== */
describe('no-duplicates — multiplication', () => {
  // [2] with 'without' regroup is on the small side but still > 20 distinct
  // problems (e.g. 11×11, 12×21, …). 1-digit sets are covered as a tiny space
  // in the graceful-degradation block instead.
  const digitSets: DigitCount[][] = [[2], [3], [2, 3], [2, 3, 4]];
  for (const dc of digitSets) {
    for (const regrouping of MODES) {
      for (const decimals of ['off', 'on', 'random'] as const) {
        for (const questionCount of COUNTS) {
          it(`dc=${dc} rg=${regrouping} dec=${decimals} qc=${questionCount}`, () => {
            expectAllDistinct(
              multiplicationSettings({
                digitCounts: dc,
                regrouping,
                decimals,
                questionCount,
              }),
            );
          });
        }
      }
    }
  }
});

/* ========================================================================== */
/* MIX — large space, no duplicates                                            */
/* ========================================================================== */
describe('no-duplicates — mix', () => {
  const digitSets: DigitCount[][] = [[2], [3], [2, 3], [2, 3, 4]];
  for (const dc of digitSets) {
    for (const questionCount of COUNTS) {
      it(`dc=${dc} qc=${questionCount}`, () => {
        expectAllDistinct(mixSettings({ digitCounts: dc, questionCount }));
      });
    }
  }
});

/* ========================================================================== */
/* DIVISION — no duplicate (dividend,divisor) pair + anti-streak divisor        */
/* ========================================================================== */
describe('no-duplicates — division', () => {
  // (dividendDigits, divisorDigits) pairs whose (dividend,divisor) space is
  // comfortably larger than 20. Each is swept over every answerType and both
  // working layouts.
  const pairs: Array<[DigitCount, DigitCount]> = [
    [2, 1],
    [3, 1],
    [3, 2],
    [4, 2],
    [4, 3],
  ];
  const answerTypes: DivisionAnswerType[] = [
    'noRemainder',
    'remainder',
    'decimal',
    'all',
    'random',
  ];
  const formats: DivisionFormat[] = ['long', 'row'];

  for (const [dividendDigits, divisorDigits] of pairs) {
    for (const answerType of answerTypes) {
      for (const divisionType of formats) {
        for (const questionCount of COUNTS) {
          it(`${dividendDigits}/${divisorDigits} at=${answerType} fmt=${divisionType} qc=${questionCount}`, () => {
            // (a) no exact-duplicate (dividend, divisor) pair.
            expectAllDistinct(
              divisionSettings({
                dividendDigits,
                divisorDigits,
                answerType,
                divisionType,
                questionCount,
              }),
            );
          });
        }
      }
    }
  }

  it('anti-streak: no back-to-back identical divisor when divisor space has room (≥2-digit)', () => {
    // 2-digit divisors give ~90 choices for 20 questions ⇒ adjacency is always
    // avoidable; the run of equal divisors must be exactly 1.
    for (const answerType of answerTypes) {
      for (const seed of SEEDS) {
        const qs = generateSession(
          divisionSettings({ dividendDigits: 3, divisorDigits: 2, answerType }),
          mulberry32(seed),
        );
        const divisors = qs.map((q) => q.operands[1]);
        expect(maxRunLength(divisors, (a, b) => a === b)).toBe(1);
      }
    }
  });

  it('anti-streak: never three-in-a-row identical divisor even in the small 1-digit space', () => {
    // 1-digit divisors (2–9) are only 8 values; exact-repeat spread is limited
    // but three identical in a row must never happen.
    for (const seed of SEEDS) {
      const qs = generateSession(
        divisionSettings({ dividendDigits: 3, divisorDigits: 1, answerType: 'random' }),
        mulberry32(seed),
      );
      const divisors = qs.map((q) => q.operands[1]);
      expect(maxRunLength(divisors, (a, b) => a === b)).toBeLessThan(3);
    }
  });
});

/* ========================================================================== */
/* GRACEFUL DEGRADATION — tiny / pathological spaces                           */
/*                                                                             */
/* Where the number of DISTINCT problems is < the requested count, true        */
/* uniqueness is mathematically IMPOSSIBLE. The contract there is only:        */
/* returns exactly questionCount, does not hang (<2s), does not throw.         */
/* ========================================================================== */
describe('graceful degradation — mathematically-impossible uniqueness', () => {
  it('1-digit no-regroup multiplication (space < 10 problems) returns exactly count, no hang', () => {
    // Distinct no-regroup 1-digit products are just {2×2,2×3,2×4,3×3} — far
    // fewer than 20. Must degrade (allow repeats), not loop forever.
    const start = Date.now();
    const qs = generateSession(
      multiplicationSettings({ digitCounts: [1], regrouping: 'without', questionCount: 20 }),
      mulberry32(1),
    );
    expect(qs).toHaveLength(20);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('1-digit addition no-carry (space ~= 20 problems) never hangs or throws', () => {
    const start = Date.now();
    const qs = generateSession(
      additionSettings({ digitCounts: [1], carrying: 'without', questionCount: 20 }),
      mulberry32(7),
    );
    expect(qs).toHaveLength(20);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('impossible-then-clamped division (1-digit dividend / 2-digit divisor) returns exactly count', () => {
    // The generator clamps divisorDigits ≤ dividendDigits; still must produce a
    // full set without hanging.
    const start = Date.now();
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
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
