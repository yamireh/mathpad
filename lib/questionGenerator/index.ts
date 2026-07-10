/**
 * Question generator.
 *
 * Pure, local, deterministic logic — no external calls. Produces a session of
 * questions from a {@link Settings} object, enforcing every mode constraint in
 * SPEC.md § Question generation rules (constraints are *guaranteed*, not just
 * statistically likely).
 */
import type {
  ConcreteOperation,
  DecimalOption,
  DigitCount,
  DivisionAnswerType,
  DivisionFormat,
  ModeOption,
  NegativeAnswerOption,
  ProblemLayout,
  Question,
  QuestionAnswer,
  Settings,
} from '../../types';

/** Random source — returns a float in [0, 1). Injectable for deterministic tests. */
export type RNG = () => number;

/** A question without its session-assigned id. */
type QuestionCore = Omit<Question, 'id'>;

/** Retry cap for rejection-sampled generators. */
const MAX_ATTEMPTS = 12000;

/* -------------------------------------------------------------------------- */
/* Random helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Inclusive random integer in [min, max]. */
function randInt(min: number, max: number, rng: RNG): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick a random element. */
function pick<T>(items: readonly T[], rng: RNG): T {
  return items[Math.floor(rng() * items.length)];
}

/** Pick a digit count uniformly from the selected multi-select set. */
function pickDigitCount(counts: DigitCount[], rng: RNG): DigitCount {
  if (counts.length === 0) return 2; // safety fallback
  return pick(counts, rng);
}

/** Smallest value with `digits` digits (1 → 1, 2 → 10, 3 → 100). */
function lowerBound(digits: DigitCount): number {
  return digits === 1 ? 1 : Math.pow(10, digits - 1);
}

/** Largest value with `digits` digits (1 → 9, 2 → 99). */
function upperBound(digits: DigitCount): number {
  return Math.pow(10, digits) - 1;
}

/** Random operand with exactly `digits` digits (no leading zero). */
function operandWithDigits(digits: DigitCount, rng: RNG): number {
  return randInt(lowerBound(digits), upperBound(digits), rng);
}

/* -------------------------------------------------------------------------- */
/* Digit / column helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Digits of `n`, least-significant first. */
function columnDigits(n: number): number[] {
  const out: number[] = [];
  let v = Math.abs(Math.trunc(n));
  if (v === 0) return [0];
  while (v > 0) {
    out.push(v % 10);
    v = Math.floor(v / 10);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Constraint checkers (exported for tests)                                     */
/* -------------------------------------------------------------------------- */

/** True if adding `a + b` produces a carry in at least one column. */
export function additionHasCarry(a: number, b: number): boolean {
  const da = columnDigits(a);
  const db = columnDigits(b);
  const cols = Math.max(da.length, db.length);
  let carry = 0;
  let any = false;
  for (let i = 0; i < cols; i++) {
    const sum = (da[i] ?? 0) + (db[i] ?? 0) + carry;
    if (sum >= 10) {
      any = true;
      carry = 1;
    } else {
      carry = 0;
    }
  }
  return any;
}

/** True if `top - bottom` (with top ≥ bottom) needs a borrow in some column. */
export function subtractionHasBorrow(top: number, bottom: number): boolean {
  const dt = columnDigits(top);
  const db = columnDigits(bottom);
  let borrow = 0;
  let any = false;
  for (let i = 0; i < dt.length; i++) {
    const diff = dt[i] - (db[i] ?? 0) - borrow;
    if (diff < 0) {
      any = true;
      borrow = 1;
    } else {
      borrow = 0;
    }
  }
  return any;
}

/** True if adding several numbers column-wise carries somewhere. */
function multiAddHasCarry(numbers: number[]): boolean {
  const cols = numbers.map(columnDigits);
  const width = Math.max(...cols.map((c) => c.length));
  let carry = 0;
  let any = false;
  for (let i = 0; i < width; i++) {
    let sum = carry;
    for (const c of cols) sum += c[i] ?? 0;
    if (sum >= 10) {
      any = true;
      carry = Math.floor(sum / 10);
    } else {
      carry = 0;
    }
  }
  return any;
}

/**
 * True if `a × b` by the standard algorithm regroups — i.e. a single-digit
 * product carries, or summing the partial products carries.
 */
export function multiplicationHasRegroup(a: number, b: number): boolean {
  const bDigits = columnDigits(b);
  const partials: number[] = [];
  for (let idx = 0; idx < bDigits.length; idx++) {
    const bd = bDigits[idx];
    if (bd === 0) continue;
    let carry = 0;
    for (const ad of columnDigits(a)) {
      const product = ad * bd + carry;
      if (product >= 10) return true; // digit × digit carried
      carry = Math.floor(product / 10);
    }
    partials.push(a * bd * Math.pow(10, idx));
  }
  return partials.length > 1 && multiAddHasCarry(partials);
}

/* -------------------------------------------------------------------------- */
/* Per-operation generators                                                     */
/* -------------------------------------------------------------------------- */

/** Resolve a `random` mode to a concrete `with`/`without` for one question. */
function resolveMode(mode: ModeOption, rng: RNG): 'with' | 'without' | 'any' {
  if (mode === 'random') return 'any';
  return mode;
}

/** Resolve a decimals option to a concrete boolean for one question. */
function resolveDecimal(option: DecimalOption, rng: RNG): boolean {
  if (option === 'random') return rng() < 0.5;
  return option === 'on';
}

/** A decimal operand with `intDigits` integer digits and `places` decimal places. */
function decimalOperand(
  intDigits: DigitCount,
  places: number,
  rng: RNG,
): number {
  const intPart = operandWithDigits(intDigits, rng);
  const frac = randInt(0, 10 ** places - 1, rng);
  return intPart + frac / 10 ** places;
}

/** Round `value` to `places` decimal places (kills float noise). */
function roundTo(value: number, places: number): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** Integer formed by `value`'s digits over `places` decimal places (e.g. 12.5,2 → 1250). */
function scaleToInt(value: number, places: number): number {
  return Math.round(Math.abs(value) * 10 ** places);
}

function generateAddition(
  counts: DigitCount[],
  carrying: ModeOption,
  decimals: DecimalOption,
  rng: RNG,
): QuestionCore {
  const want = resolveMode(carrying, rng);
  if (resolveDecimal(decimals, rng)) {
    return generateAdditionDecimal(counts, want, rng);
  }
  let last: [number, number] = [0, 0];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const a = operandWithDigits(pickDigitCount(counts, rng), rng);
    const b = operandWithDigits(pickDigitCount(counts, rng), rng);
    last = [a, b];
    const carry = additionHasCarry(a, b);
    if (want === 'with' && !carry) continue;
    if (want === 'without' && carry) continue;
    return {
      operation: 'addition',
      operands: [a, b],
      answer: { kind: 'integer', value: a + b },
      layout: 'vertical',
    };
  }
  return {
    operation: 'addition',
    operands: last,
    answer: { kind: 'integer', value: last[0] + last[1] },
    layout: 'vertical',
  };
}

/** Decimal addition: 1–2 place operands; carrying checked on the scaled digits. */
function generateAdditionDecimal(
  counts: DigitCount[],
  want: 'with' | 'without' | 'any',
  rng: RNG,
): QuestionCore {
  let last: QuestionCore | null = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const p1 = randInt(1, 2, rng);
    const p2 = randInt(1, 2, rng);
    const a = decimalOperand(pickDigitCount(counts, rng), p1, rng);
    const b = decimalOperand(pickDigitCount(counts, rng), p2, rng);
    const decCols = Math.max(p1, p2);
    const core: QuestionCore = {
      operation: 'addition',
      operands: [a, b],
      operandDecimals: [p1, p2],
      answer: { kind: 'decimal', value: roundTo(a + b, decCols), decimalPlaces: decCols },
      layout: 'vertical',
    };
    last ??= core;
    const carry = additionHasCarry(scaleToInt(a, decCols), scaleToInt(b, decCols));
    if (want === 'with' && !carry) continue;
    if (want === 'without' && carry) continue;
    return core;
  }
  return last as QuestionCore;
}

function generateSubtraction(
  counts: DigitCount[],
  borrowing: ModeOption,
  allowNegative: NegativeAnswerOption,
  decimals: DecimalOption,
  rng: RNG,
): QuestionCore {
  const wantBorrow = resolveMode(borrowing, rng);
  // Resolve whether this question has a negative answer.
  const negative =
    allowNegative === 'on'
      ? true
      : allowNegative === 'off'
        ? false
        : rng() < 0.5;

  if (resolveDecimal(decimals, rng)) {
    // Decimal subtraction stays non-negative for now (the decimal answer area
    // has no sign box yet); `negative` is intentionally ignored here.
    return generateSubtractionDecimal(counts, wantBorrow, rng);
  }

  let fallback: QuestionCore | null = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const a = operandWithDigits(pickDigitCount(counts, rng), rng);
    const b = operandWithDigits(pickDigitCount(counts, rng), rng);
    if (a === b) continue; // avoid trivial zero / impossible negative
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    // Top operand: smaller for a negative answer, larger otherwise.
    const top = negative ? smaller : larger;
    const bottom = negative ? larger : smaller;
    const core: QuestionCore = {
      operation: 'subtraction',
      operands: [top, bottom],
      answer: { kind: 'integer', value: top - bottom },
      layout: 'vertical',
    };
    fallback ??= core;
    // Borrowing is a property of computing larger − smaller.
    const borrow = subtractionHasBorrow(larger, smaller);
    if (wantBorrow === 'with' && !borrow) continue;
    if (wantBorrow === 'without' && borrow) continue;
    return core;
  }
  return fallback as QuestionCore;
}

/** Decimal subtraction (non-negative): borrow checked on the scaled digits. */
function generateSubtractionDecimal(
  counts: DigitCount[],
  wantBorrow: 'with' | 'without' | 'any',
  rng: RNG,
): QuestionCore {
  let fallback: QuestionCore | null = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const p1 = randInt(1, 2, rng);
    const p2 = randInt(1, 2, rng);
    const a = decimalOperand(pickDigitCount(counts, rng), p1, rng);
    const b = decimalOperand(pickDigitCount(counts, rng), p2, rng);
    if (a === b) continue;
    const decCols = Math.max(p1, p2);
    // Larger on top → non-negative difference.
    const top = Math.max(a, b);
    const bottom = Math.min(a, b);
    const topPlaces = top === a ? p1 : p2;
    const bottomPlaces = bottom === a ? p1 : p2;
    const core: QuestionCore = {
      operation: 'subtraction',
      operands: [top, bottom],
      operandDecimals: [topPlaces, bottomPlaces],
      answer: {
        kind: 'decimal',
        value: roundTo(top - bottom, decCols),
        decimalPlaces: decCols,
      },
      layout: 'vertical',
    };
    fallback ??= core;
    const borrow = subtractionHasBorrow(
      scaleToInt(top, decCols),
      scaleToInt(bottom, decCols),
    );
    if (wantBorrow === 'with' && !borrow) continue;
    if (wantBorrow === 'without' && borrow) continue;
    return core;
  }
  return fallback as QuestionCore;
}

function generateMultiplication(
  counts: DigitCount[],
  regrouping: ModeOption,
  decimals: DecimalOption,
  rng: RNG,
): QuestionCore {
  const want = resolveMode(regrouping, rng);
  if (resolveDecimal(decimals, rng)) {
    return generateMultiplicationDecimal(counts, want, rng);
  }
  let last: [number, number] = [0, 0];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const x = operandWithDigits(pickDigitCount(counts, rng), rng);
    const y = operandWithDigits(pickDigitCount(counts, rng), rng);
    // Standard column layout: the larger operand (always ≥ digits) is the
    // multiplicand on top, the shorter one the multiplier below — never a
    // 2-digit stacked over a 3-digit.
    const a = Math.max(x, y);
    const b = Math.min(x, y);
    if (b === 1) continue; // ×1 is a no-op — skip the trivial question
    last = [a, b];
    const regroup = multiplicationHasRegroup(a, b);
    if (want === 'with' && !regroup) continue;
    if (want === 'without' && regroup) continue;
    return {
      operation: 'multiplication',
      operands: [a, b],
      answer: { kind: 'integer', value: a * b },
      layout: 'vertical',
    };
  }
  return {
    operation: 'multiplication',
    operands: last,
    answer: { kind: 'integer', value: last[0] * last[1] },
    layout: 'vertical',
  };
}

/** Decimal multiplication: operand places capped so the product stays ≤ 3. */
function generateMultiplicationDecimal(
  counts: DigitCount[],
  want: 'with' | 'without' | 'any',
  rng: RNG,
): QuestionCore {
  let last: QuestionCore | null = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const px = randInt(1, 2, rng);
    const py = randInt(1, Math.max(1, 3 - px), rng); // px + py ≤ 3
    const x = decimalOperand(pickDigitCount(counts, rng), px, rng);
    const y = decimalOperand(pickDigitCount(counts, rng), py, rng);
    // Larger value on top as the multiplicand (with its own decimal places),
    // matching the integer layout convention.
    const [a, pa, b, pb] = x >= y ? [x, px, y, py] : [y, py, x, px];
    if (a === 1 || b === 1) continue; // skip trivial ×1.0
    const places = pa + pb;
    const core: QuestionCore = {
      operation: 'multiplication',
      operands: [a, b],
      operandDecimals: [pa, pb],
      answer: { kind: 'decimal', value: roundTo(a * b, places), decimalPlaces: places },
      layout: 'vertical',
    };
    last ??= core;
    // Regrouping is a property of multiplying the scaled-integer digit strings.
    const regroup = multiplicationHasRegroup(scaleToInt(a, pa), scaleToInt(b, pb));
    if (want === 'with' && !regroup) continue;
    if (want === 'without' && regroup) continue;
    return core;
  }
  return last as QuestionCore;
}

/** Divisors of 1000 (≥ 2) by digit count — these always yield ≤3-place decimals. */
const TERMINATING_DIVISORS: Record<DigitCount, number[]> = {
  1: [2, 4, 5, 8],
  2: [10, 20, 25, 40, 50],
  3: [100, 125, 200, 250, 500],
  4: [1000],
};

/** Decimal places of `dividend / divisor` where `divisor` divides 1000. */
function decimalPlacesOf(dividend: number, divisor: number): number {
  let scaled = (dividend * 1000) / divisor; // integer
  let places = 3;
  while (places > 0 && scaled % 10 === 0) {
    scaled /= 10;
    places -= 1;
  }
  return places;
}

function divisionLayout(decimal: boolean, format: DivisionFormat): ProblemLayout {
  // The working layout is chosen up front in settings (no mid-solution
  // toggle). `row` is the inline `a ÷ b = ` layout — decimal-aware when the
  // answer is a decimal; `long` is the bracket staircase for every case.
  if (format === 'row') return decimal ? 'divisionDecimal' : 'divisionHorizontal';
  return 'divisionLong';
}

function generateDivision(
  dividendDigits: DigitCount,
  divisorDigits: DigitCount,
  answerType: DivisionAnswerType,
  format: DivisionFormat,
  rng: RNG,
): QuestionCore {
  const resolved: 'noRemainder' | 'remainder' | 'decimal' =
    answerType === 'random' || answerType === 'all'
      ? pick(['noRemainder', 'remainder', 'decimal'] as const, rng)
      : answerType;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const lo = lowerBound(dividendDigits);
    const hi = upperBound(dividendDigits);

    if (resolved === 'decimal') {
      const candidates = TERMINATING_DIVISORS[divisorDigits];
      if (candidates.length === 0) continue;
      const divisor = pick(candidates, rng);
      const dividend = randInt(lo, hi, rng);
      if (dividend % divisor === 0) continue; // need a real decimal
      return {
        operation: 'division',
        operands: [dividend, divisor],
        answer: {
          kind: 'decimal',
          value: dividend / divisor,
          decimalPlaces: decimalPlacesOf(dividend, divisor),
        },
        layout: divisionLayout(true, format),
      };
    }

    if (resolved === 'noRemainder') {
      const dLo = Math.max(2, lowerBound(divisorDigits));
      const dHi = upperBound(divisorDigits);
      // Pick the DIVISOR uniformly across its whole digit range first, so the
      // set shows varied, non-"round" divisors (…÷19, …÷47) rather than the
      // 10/11/12 that dominate when the quotient is chosen first — a large
      // quotient forces the divisor down against its lower bound. Then pick a
      // quotient (≥ 2, so the dividend never equals the divisor) that keeps the
      // dividend inside its digit range.
      const divisor = randInt(dLo, dHi, rng);
      const qLo = Math.max(2, Math.ceil(lo / divisor));
      const qHi = Math.floor(hi / divisor);
      if (qHi < qLo) continue;
      const quotient = randInt(qLo, qHi, rng);
      const dividend = quotient * divisor;
      return {
        operation: 'division',
        operands: [dividend, divisor],
        answer: { kind: 'integer', value: quotient },
        layout: divisionLayout(false, format),
      };
    }

    // remainder — divisor ≥ 2, then a quotient that fits the dividend range.
    const divisor = Math.max(2, operandWithDigits(divisorDigits, rng));
    const kHi = Math.floor((hi - 1) / divisor);
    const kLo = Math.max(1, Math.ceil((lo - (divisor - 1)) / divisor));
    if (kHi < kLo) continue;
    const quotient = randInt(kLo, kHi, rng);
    const remainder = randInt(1, divisor - 1, rng);
    const dividend = quotient * divisor + remainder;
    if (dividend < lo || dividend > hi) continue;
    return {
      operation: 'division',
      operands: [dividend, divisor],
      answer: { kind: 'remainder', quotient, remainder },
      layout: divisionLayout(false, format),
    };
  }

  // Best-effort fallback: a simple clean division.
  return {
    operation: 'division',
    operands: [12, 4],
    answer: { kind: 'integer', value: 3 },
    layout: divisionLayout(false, format),
  };
}

/* -------------------------------------------------------------------------- */
/* Session generation                                                          */
/* -------------------------------------------------------------------------- */

/** Generate one question for the given concrete operation + settings. */
function generateForOperation(
  operation: ConcreteOperation,
  settings: Settings,
  rng: RNG,
): QuestionCore {
  const { digitCounts } = settings;
  switch (operation) {
    case 'addition':
      return generateAddition(
        digitCounts,
        settings.operation === 'addition' ? settings.carrying : 'random',
        // Mix mode stays integer-only (SPEC).
        settings.operation === 'addition' ? settings.decimals : 'off',
        rng,
      );
    case 'subtraction':
      return generateSubtraction(
        digitCounts,
        settings.operation === 'subtraction' ? settings.borrowing : 'random',
        settings.operation === 'subtraction' ? settings.allowNegative : 'off',
        settings.operation === 'subtraction' ? settings.decimals : 'off',
        rng,
      );
    case 'multiplication':
      return generateMultiplication(
        digitCounts,
        settings.operation === 'multiplication'
          ? settings.regrouping
          : 'random',
        settings.operation === 'multiplication' ? settings.decimals : 'off',
        rng,
      );
    case 'division':
      return generateDivision(
        // Division uses fixed dividend / divisor digit counts instead of a
        // range. Mix mode falls back to a sensible default (3-digit ÷ 1).
        settings.operation === 'division' ? settings.dividendDigits : 3,
        settings.operation === 'division' ? settings.divisorDigits : 1,
        // Mix mode keeps division simple: clean integer answers only.
        settings.operation === 'division'
          ? settings.answerType
          : 'noRemainder',
        // Mix mode uses the long-division layout (its richer scaffold).
        settings.operation === 'division' ? settings.divisionType : 'long',
        rng,
      );
  }
}

const MIX_OPERATIONS: readonly ConcreteOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

/**
 * How many times to regenerate a question to dodge a duplicate before giving
 * up. Small constraint spaces (e.g. 1-digit no-carry addition) can legitimately
 * run out of distinct problems, so on exhaustion we accept a repeat rather than
 * loop forever.
 */
const DEDUP_ATTEMPTS = 40;

/** Operations where operand order doesn't change the problem (a∘b === b∘a). */
const COMMUTATIVE: ReadonlySet<ConcreteOperation> = new Set([
  'addition',
  'multiplication',
]);

/**
 * Signature identifying a "repeat" question. Operands are order-normalized for
 * commutative operations, so 11+44 and 44+11 count as the same problem; decimal
 * place metadata is folded in so e.g. 4.0 and 4.00 stay distinct.
 */
function questionSignature(core: QuestionCore): string {
  const ops = COMMUTATIVE.has(core.operation)
    ? [...core.operands].sort((a, b) => a - b)
    : core.operands;
  const dec = core.operandDecimals ? `d${core.operandDecimals.join(',')}` : '';
  return `${core.operation}|${ops.join('x')}|${dec}`;
}

/**
 * Reject trivially-degenerate problems: a division whose dividend equals its
 * divisor (e.g. 44 ÷ 44 = 1). Same-operand problems for other operations
 * (44+44, 7×7) are legitimate practice and kept.
 */
function isDegenerate(core: QuestionCore): boolean {
  return core.operation === 'division' && core.operands[0] === core.operands[1];
}

/**
 * Generate a full session of questions for the given settings.
 *
 * @param settings  Validated session settings.
 * @param rng       Random source; defaults to `Math.random`. Inject for tests.
 */
export function generateSession(
  settings: Settings,
  rng: RNG = Math.random,
): Question[] {
  const count = settings.questionCount;
  const questions: Question[] = [];
  // No two questions in a session are the same problem (order-normalized), and
  // no trivially-degenerate ones — so a session reads as varied and random.
  const seen = new Set<string>();
  const nextOperation = (): ConcreteOperation =>
    settings.operation === 'mix' ? pick(MIX_OPERATIONS, rng) : settings.operation;

  for (let i = 0; i < count; i++) {
    let chosen: QuestionCore | null = null;
    for (let attempt = 0; attempt < DEDUP_ATTEMPTS; attempt++) {
      const core = generateForOperation(nextOperation(), settings, rng);
      if (isDegenerate(core)) continue;
      chosen = core; // newest valid candidate — kept as the fallback
      if (!seen.has(questionSignature(core))) break;
    }
    // Only null if every attempt was degenerate (near-impossible); take one more.
    chosen ??= generateForOperation(nextOperation(), settings, rng);
    seen.add(questionSignature(chosen));
    questions.push({ id: `q-${i + 1}`, ...chosen });
  }
  return questions;
}
