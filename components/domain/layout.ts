/**
 * Shared layout constants and answer-area geometry for the math UI.
 *
 * The problem digits and the handwriting answer boxes use the same column
 * width so they line up vertically.
 */
import type { ConcreteOperation, Question } from '../../types';

/**
 * Width of one digit column — problem digits and answer boxes alike. Sized
 * generously so finger handwriting has room (tuned from on-device testing).
 */
export const DIGIT_COLUMN_WIDTH = 76;

/** Height of a handwriting answer box. */
export const ANSWER_BOX_HEIGHT = 100;

/**
 * Compact dimensions for the long-division layout. The quotient strip and
 * the per-step draft cells are shorter than +/×'s answer boxes — the
 * dividend can be up to 4 digits which means 6–8 rows of draft work, and
 * the kid still needs room for the writing pad below.
 */
export const DIVISION_QUOTIENT_HEIGHT = 40;
export const DIVISION_DRAFT_CELL_WIDTH = 56;
export const DIVISION_DRAFT_CELL_HEIGHT = 40;
export const DIVISION_DIGIT_SIZE = 30;
/** Width reserved at the bracket's left edge for each step's "−" sign. */
export const DIVISION_MINUS_WIDTH = 22;

/**
 * Per-row geometry for the long-division draft grid. Row 0 is the first
 * product row (no carry/bring-down) and is exactly `columns` wide. Every
 * row after that defaults to `columns + 1` wide, and each *pair* of rows
 * (the product + difference for one quotient step) shifts one column
 * further to the right than the previous pair — mirroring how a kid
 * writes long division on paper.
 *
 * When `options` is provided, the layout becomes math-aware: a step's
 * `startCol` can drop BELOW the pair-shift default if that step's product
 * (≤ `divisorDigits + 1` digits) would otherwise extend leftward past
 * the typical cell range. This handles dividend < divisor cases where
 * decimal-expansion products are unusually wide — e.g. `137 ÷ 200`
 * step 1 has `6 × 200 = 1200`, which needs col 0 to render the leading
 * "1" instead of dropping it.
 */
export function divisionDraftRowLayout(
  row: number,
  columns: number,
  options?: { divisorDigits: number; integerQuotientDigits: number },
): { startCol: number; cellCount: number } {
  if (row === 0) return { startCol: 0, cellCount: columns };
  const step = Math.floor(row / 2);
  if (options && options.divisorDigits > 0) {
    const offset = columns - options.integerQuotientDigits;
    const rightCol = step + offset;
    const maxProductWidth = options.divisorDigits + 1;
    // Either the pair-shift default OR — if the product would clip — the
    // earliest column the product could land on, whichever is further left.
    const startCol = Math.max(0, rightCol - maxProductWidth + 1);
    // Both prod and diff in a step share the same cell range; diff's
    // brought-down digit lives at rightCol + 1, so cellCount must cover it.
    const rightmost = rightCol + 1;
    return {
      startCol,
      cellCount: Math.max(1, rightmost - startCol + 1),
    };
  }
  return { startCol: step, cellCount: columns + 1 };
}

/**
 * The long-division draft grid columns and an initial visible row count.
 * `columns` mirrors the dividend digit count. `initialRows` is just enough
 * for the kid's first step (product + difference); the workspace grows the
 * grid as the kid fills toward the bottom. Below 2 dividend digits there's
 * nothing to draft.
 */
export function divisionDraftSize(dividend: number): {
  rows: number;
  columns: number;
} {
  const columns = digitCount(dividend);
  const rows = columns < 2 ? 0 : 2;
  return { rows, columns };
}

/** Font size for printed problem digits. */
export const PROBLEM_DIGIT_SIZE = 38;

/** Width reserved for the operator to the left of the second operand. */
export const OPERATOR_COLUMN_WIDTH = 44;

/**
 * Bundle of measurements that flows from `QuestionWorkspace` down to every
 * component on the column grid (operand digits, answer boxes, carry boxes,
 * partial-product rows, etc.). One instance per question — passed into
 * `ProblemDisplay` via its `sizing` prop and into `AnswerArea` / `AnswerBox`
 * via `cellWidth` + `boxHeight`. Per-mode tweaks are spread on top:
 *
 * ```ts
 * const base = problemSizing(columns, availableWidth);
 * const sizing: ProblemSizing = { ...base, carryHeight: 30 }; // override
 * ```
 */
export interface ProblemSizing {
  cellWidth: number;
  boxHeight: number;
  digitSize: number;
  operatorWidth: number;
  carryWidth: number;
  carryHeight: number;
}

/**
 * Larger column / box dimensions kept around for compatibility with default
 * component prop fallbacks (e.g. `ProblemDisplay`'s default when no `sizing`
 * is passed) and for any future "wide" mode. Live workspaces use
 * `problemSizing()` / `compactSizing()` so every operation shares the same
 * tight grid that multi-digit multiplication uses.
 */
export function regularSizing(): ProblemSizing {
  return {
    cellWidth: DIGIT_COLUMN_WIDTH,
    boxHeight: ANSWER_BOX_HEIGHT,
    digitSize: PROBLEM_DIGIT_SIZE,
    operatorWidth: OPERATOR_COLUMN_WIDTH,
    carryWidth: DIGIT_COLUMN_WIDTH - 22,
    carryHeight: 46,
  };
}

/** Comfortable upper bounds for the unified compact layout. */
const COMPACT_MAX_CELL = 53;
const COMPACT_MAX_OPERATOR = 31;
const COMPACT_MAX_DIGIT = 27;
/** Hard lower bound for the cell width — below this, ink doesn't fit. */
const COMPACT_MIN_CELL = 30;

/**
 * The unified problem sizing used by every operation. Pick a cell width
 * that fits `columns + operator` inside `availableWidth`, never exceeding
 * the comfortable maxes. Box height stays fixed (vertical space is handled
 * separately); only the horizontal dimensions and the paired digit font
 * shrink proportionally.
 */
export function compactSizing(
  columns: number,
  availableWidth: number,
): ProblemSizing {
  const fit = Math.floor((availableWidth - COMPACT_MAX_OPERATOR) / columns);
  const cellWidth = Math.max(
    COMPACT_MIN_CELL,
    Math.min(COMPACT_MAX_CELL, fit),
  );
  // Scale operator + digit font in step with the cell width.
  const scale = cellWidth / COMPACT_MAX_CELL;
  const operatorWidth = Math.max(20, Math.round(COMPACT_MAX_OPERATOR * scale));
  const digitSize = Math.max(18, Math.round(COMPACT_MAX_DIGIT * scale));
  return {
    cellWidth,
    boxHeight: 50,
    digitSize,
    operatorWidth,
    carryWidth: Math.max(20, cellWidth - 14),
    carryHeight: 26,
  };
}

/**
 * Convenience wrapper: builds the unified `compactSizing(columns,
 * availableWidth)` and spreads `overrides` on top. Each mode (addition,
 * subtraction, single-digit ×, multi-digit ×, division) calls this with the
 * subset of fields it wants to customize — keeping the look unified while
 * letting any mode breathe (or tighten) where it needs to.
 *
 * ```ts
 * // Addition with bigger carry boxes:
 * problemSizing(cols, w, { carryHeight: 32, carryWidth: 44 });
 * ```
 */
export function problemSizing(
  columns: number,
  availableWidth: number,
  overrides?: Partial<ProblemSizing>,
): ProblemSizing {
  return { ...compactSizing(columns, availableWidth), ...overrides };
}

/**
 * Sizing for the long-division grid: no operator column, divisor sits to
 * the left of the bracket (subtracted from `availableForCells` by the
 * caller). Returns the largest comfortable cell width that lets the full
 * staircase fit horizontally, clamping at the compact bounds.
 *
 * The returned `digitSize` is used for BOTH the divisor (rendered as
 * text to the left of the bracket) and the dividend digit cells, so the
 * two "operand" numbers always read at the same glance-size — a touch
 * larger than the inside-cell digits since they anchor the whole problem.
 */
export function divisionSizing(
  totalCellCount: number,
  availableForCells: number,
): { cellWidth: number; digitSize: number } {
  const fit = Math.floor(availableForCells / Math.max(1, totalCellCount));
  const cellWidth = Math.max(
    COMPACT_MIN_CELL,
    Math.min(COMPACT_MAX_CELL, fit),
  );
  const scale = cellWidth / COMPACT_MAX_CELL;
  // 32pt at the widest cell — between the compact-mode digit (27pt) and
  // the regular problem digit (38pt), as the kid asked.
  const digitSize = Math.max(22, Math.round(32 * scale));
  return { cellWidth, digitSize };
}

/** Printed operator symbol per operation. */
export const operatorSymbol: Record<ConcreteOperation, string> = {
  addition: '+',
  subtraction: '−', // minus sign
  multiplication: '×', // multiplication sign
  division: '÷', // division sign
};

/** Digit count of an integer (sign ignored). */
export function digitCount(n: number): number {
  return String(Math.abs(Math.trunc(n))).length;
}

/**
 * Widths of each partial product row when computing `op1 × op2` as taught:
 * one row per digit of `op2`, each width = `digitCount(op1 × digit_R)`.
 * Returns `null` when `op2` is single-digit — no partial-product UI is
 * needed; the answer row alone shows the result.
 */
export function partialWidths(op1: number, op2: number): number[] | null {
  const m = Math.abs(op2);
  if (m < 10) return null;
  const widths: number[] = [];
  let v = m;
  while (v > 0) {
    const d = v % 10;
    widths.push(d === 0 ? 1 : digitCount(Math.abs(op1) * d));
    v = Math.floor(v / 10);
  }
  return widths;
}

/**
 * Per-step carries for one partial product `digit × op1`. The returned
 * boolean array has length `digitCount(op1) - 1`; index `pos` is true when
 * multiplying op1's position-from-right `pos` digit generates a carry into
 * op1's next column to the left. Drives auto-advance into the right
 * `tcarry-*` slot between partial cells.
 */
export function partialMultiplicationCarries(
  op1: number,
  digit: number,
  op1Cols: number,
): boolean[] {
  const out = new Array<boolean>(Math.max(0, op1Cols - 1)).fill(false);
  let a = Math.abs(op1);
  let carry = 0;
  for (let pos = 0; pos < op1Cols; pos += 1) {
    const product = (a % 10) * Math.abs(digit) + carry;
    const nextCarry = Math.floor(product / 10);
    if (pos < op1Cols - 1 && nextCarry > 0) out[pos] = true;
    carry = nextCarry;
    a = Math.floor(a / 10);
  }
  return out;
}

/** The shape of the answer area for a question. */
export interface AnswerShape {
  /** A leading minus-sign box (negative-answer mode). */
  hasSign: boolean;
  /** Number of integer digit boxes. */
  integerBoxes: number;
  /** Number of decimal digit boxes (0 unless decimal mode). */
  decimalBoxes: number;
  /** Number of remainder digit boxes (0 unless remainder mode). */
  remainderBoxes: number;
}

/**
 * Derive the answer-area shape from a question.
 *
 * Division uses wide write-directly strips — one for the whole quotient, plus
 * a strip for a remainder, or a decimal strip after a pre-printed separator.
 * Every other operation uses one box per digit column.
 */
export function answerShape(question: Question): AnswerShape {
  const { answer } = question;
  switch (answer.kind) {
    case 'integer':
      return {
        hasSign: answer.value < 0,
        integerBoxes: digitCount(answer.value),
        decimalBoxes: 0,
        remainderBoxes: 0,
      };
    case 'remainder':
      return {
        hasSign: false,
        integerBoxes: digitCount(answer.quotient),
        decimalBoxes: 0,
        remainderBoxes: digitCount(answer.remainder),
      };
    case 'decimal':
      return {
        hasSign: false,
        integerBoxes: digitCount(Math.trunc(answer.value)),
        // SPEC: up to 3 decimal boxes; the kid leaves trailing ones blank.
        decimalBoxes: 3,
        remainderBoxes: 0,
      };
  }
}
