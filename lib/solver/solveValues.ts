/**
 * Compute the "correct digit" for every box id in a problem — the source
 * of truth for the Solve animation and any future e2e flow.
 *
 * The runner walks the same `fillSequence` order the kid would, looks up
 * each box id here, and writes the digit (as synthetic ink) when present.
 * Boxes not in the map are left empty.
 */
import {
  answerShape,
  digitCount,
  divisionDraftRowLayout,
  multiplicationDigitOperands,
  partialMultiplicationCarries,
  partialWidths,
  verticalGeometry,
} from '../../components/domain/layout';
import { computeBorrowDisplay } from '../../components/domain/borrow';
import type { ProblemLayout, Question } from '../../types';

export interface SolvePlan {
  /** Digits to write per box id. Boxes not in the map are left untouched. */
  values: Map<string, number>;
  /** Top-operand column indices (left → right) to tap as borrow lenders. */
  borrows: number[];
  /**
   * Long-division draft cells that receive a brought-down digit (rather
   * than a product/diff digit). Used by the auto-solver to animate the
   * digit visibly dropping down from the dividend instead of just popping
   * into place. Empty for non-long-division questions.
   */
  bringDownCells: Set<string>;
}

/** Build the full Solve plan for a question, given its current layout. */
export function computeSolvePlan(
  question: Question,
  layout: ProblemLayout,
): SolvePlan {
  switch (question.operation) {
    case 'addition':
      return solveAddition(question);
    case 'subtraction':
      return solveSubtraction(question);
    case 'multiplication':
      return solveMultiplication(question);
    case 'division':
      return solveDivision(question, layout);
  }
}

/* -------------------------------------------------------------------------- */
/* Addition                                                                     */
/* -------------------------------------------------------------------------- */

function solveAddition(question: Question): SolvePlan {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const values = new Map<string, number>();
  const decCols = shape.decimalBoxes;
  const total = shape.integerBoxes + decCols;
  // Work on the scaled-integer grid (operand × 10^decCols) so decimal places
  // are just more columns; decCols 0 → the original integer behaviour.
  let a = Math.round(Math.abs(op1) * 10 ** decCols);
  let b = Math.round(Math.abs(op2) * 10 ** decCols);
  let carry = 0;
  // Column-wise sum, right (least significant) → left. Each grid column writes
  // its result digit into the matching int-/dec- box and, when it carries,
  // lights up the carry box above the column to its left (crossing the dot).
  for (let gridCol = total - 1; gridCol >= 0; gridCol -= 1) {
    const d1 = a % 10;
    const d2 = b % 10;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    const sum = d1 + d2 + carry;
    const boxId =
      gridCol < shape.integerBoxes
        ? `int-${gridCol}`
        : `dec-${gridCol - shape.integerBoxes}`;
    values.set(boxId, sum % 10);
    const nextCarry = Math.floor(sum / 10);
    if (nextCarry > 0 && gridCol - 1 >= 0) {
      values.set(`carry-${gridCol - 1}`, nextCarry);
    }
    carry = nextCarry;
  }
  return { values, borrows: [], bringDownCells: new Set() };
}

/* -------------------------------------------------------------------------- */
/* Subtraction                                                                  */
/* -------------------------------------------------------------------------- */

function solveSubtraction(question: Question): SolvePlan {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const values = new Map<string, number>();

  // Work over the full (integer + decimal) grid. Operands are scaled to their
  // digit strings so decimal places are just more columns; the minuend (op1 ≥
  // op2 for non-negative mode) fills the integer columns, so it has no leading
  // zeros. `total` columns; columns ≥ intCols are decimal places. decCols 0 →
  // the original integer behaviour.
  const { intCols, decCols } = verticalGeometry(question);
  const total = intCols + decCols;
  const scale = 10 ** decCols;
  const digits = String(Math.round(Math.abs(op1) * scale))
    .padStart(total, '0')
    .split('')
    .map(Number);
  const subtrahend = String(Math.round(Math.abs(op2) * scale))
    .padStart(total, '0')
    .split('')
    .map(Number);

  // Walk right → left, tapping the column to the left of each column that
  // would underflow. `computeBorrowDisplay` handles cascade (tapping a 0
  // column drags another borrow further left). Borrow indices are grid columns
  // (into `digits`) — the same indices the BorrowDigitRow's marks use.
  const borrows: number[] = [];
  for (let i = total - 1; i >= 0; i -= 1) {
    const display = computeBorrowDisplay(digits, borrows);
    if (display[i].value < subtrahend[i] && i - 1 >= 0) {
      borrows.push(i - 1);
    }
  }

  // Result digit per grid column → its answer box. The answer has fewer
  // integer digits than the grid when the difference is shorter than the
  // minuend, so integer boxes are offset to the rightmost integer columns.
  const finalDisplay = computeBorrowDisplay(digits, borrows);
  const intOffset = intCols - shape.integerBoxes;
  for (let i = 0; i < total; i += 1) {
    const r = finalDisplay[i].value - subtrahend[i];
    if (r < 0) continue;
    if (i >= intCols) {
      values.set(`dec-${i - intCols}`, r);
    } else if (i - intOffset >= 0) {
      values.set(`int-${i - intOffset}`, r);
    }
  }
  return { values, borrows, bringDownCells: new Set() };
}

/* -------------------------------------------------------------------------- */
/* Multiplication                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The sum/answer box id for grid column `i` (0 = most significant). Columns
 * left of `integerBoxes` are integer boxes; the rest are decimal boxes (the
 * product's digit string split at the decimal point).
 */
function sumBoxId(i: number, integerBoxes: number): string {
  return i < integerBoxes ? `int-${i}` : `dec-${i - integerBoxes}`;
}

function solveMultiplication(question: Question): SolvePlan {
  const shape = answerShape(question);
  // Multiply the operand digit strings as integers (decimal `×` places the dot
  // in the product afterward). Integer operands pass through unchanged.
  const [a1, a2] = multiplicationDigitOperands(question);
  const partials = partialWidths(a1, a2);
  if (partials) {
    return solveMultiplicationMultiDigit(question);
  }
  // Single-digit multiplier: column-wise multiply, carrying like addition.
  const values = new Map<string, number>();
  const sumTotal = shape.integerBoxes + shape.decimalBoxes;
  let a = a1;
  const m = a2;
  let carry = 0;
  for (let col = sumTotal - 1; col >= 0; col -= 1) {
    const d = a % 10;
    a = Math.floor(a / 10);
    const total = d * m + carry;
    values.set(sumBoxId(col, shape.integerBoxes), total % 10);
    const nextCarry = Math.floor(total / 10);
    if (nextCarry > 0 && col - 1 >= 0) {
      values.set(`carry-${col - 1}`, nextCarry);
    }
    carry = nextCarry;
  }
  return { values, borrows: [], bringDownCells: new Set() };
}

function solveMultiplicationMultiDigit(question: Question): SolvePlan {
  const shape = answerShape(question);
  const [a1, a2] = multiplicationDigitOperands(question);
  const partials = partialWidths(a1, a2);
  if (!partials)
    return { values: new Map(), borrows: [], bringDownCells: new Set() };
  const op1Cols = digitCount(a1);
  const values = new Map<string, number>();

  // Per partial row: write each digit of (a1 × digit_r) right-to-left, and
  // place each step's carry into the `tcarry-{row}-{op1Col}` slot when the
  // math actually produces one. (Partials are integer digit-string products.)
  let m = a2;
  for (let r = 0; r < partials.length; r += 1) {
    const width = partials[r];
    const d = m % 10;
    m = Math.floor(m / 10);
    if (d === 0) {
      values.set(`pp-${r}-${width - 1}`, 0);
      continue;
    }
    const tcarries = partialMultiplicationCarries(a1, d, op1Cols);
    let a = a1;
    let carry = 0;
    for (let pos = 0; pos < op1Cols; pos += 1) {
      const digit = a % 10;
      a = Math.floor(a / 10);
      const total = digit * d + carry;
      const cellCol = width - 1 - pos;
      values.set(`pp-${r}-${cellCol}`, total % 10);
      const nextCarry = Math.floor(total / 10);
      if (pos < op1Cols - 1 && tcarries[pos]) {
        values.set(`tcarry-${r}-${op1Cols - 2 - pos}`, nextCarry);
      }
      carry = nextCarry;
    }
    if (width > op1Cols && carry > 0) {
      values.set(`pp-${r}-0`, carry);
    }
  }

  // Final sum: the product's digits, split into int-/dec- boxes, plus the
  // carry digits between sum columns.
  const sumTotal = shape.integerBoxes + shape.decimalBoxes;
  const product = a1 * a2;
  const sumDigits = String(product)
    .padStart(sumTotal, '0')
    .split('')
    .map(Number);
  for (let i = 0; i < sumTotal; i += 1) {
    values.set(sumBoxId(i, shape.integerBoxes), sumDigits[i]);
  }
  // Carry digits across the final sum of the shifted partial products.
  const partialValues: number[] = [];
  let m2 = a2;
  let shift = 1;
  while (m2 > 0) {
    partialValues.push(a1 * (m2 % 10) * shift);
    m2 = Math.floor(m2 / 10);
    shift *= 10;
  }
  let acc = 0;
  const remaining = partialValues.map((v) => v);
  for (let pos = 0; pos < sumTotal; pos += 1) {
    let s = acc;
    for (let i = 0; i < remaining.length; i += 1) {
      s += remaining[i] % 10;
      remaining[i] = Math.floor(remaining[i] / 10);
    }
    const nextCarry = Math.floor(s / 10);
    if (nextCarry > 0) {
      const carryCol = sumTotal - 2 - pos;
      if (carryCol >= 0) values.set(`carry-${carryCol}`, nextCarry);
    }
    acc = nextCarry;
  }

  return { values, borrows: [], bringDownCells: new Set() };
}

/* -------------------------------------------------------------------------- */
/* Division                                                                     */
/* -------------------------------------------------------------------------- */

function solveDivision(question: Question, layout: ProblemLayout): SolvePlan {
  const [dividend, divisor] = question.operands;
  const shape = answerShape(question);
  const values = new Map<string, number>();
  const absD = Math.abs(dividend);
  const absDiv = Math.abs(divisor);

  const integerQuotient = Math.floor(absD / absDiv);
  const integerRemainder = absD - integerQuotient * absDiv;

  // Integer quotient digits → `int-N`, left → right.
  const intDigits = String(integerQuotient).split('').map(Number);
  for (let i = 0; i < intDigits.length && i < shape.integerBoxes; i += 1) {
    values.set(`int-${i}`, intDigits[i]);
  }

  // Decimal expansion (for decimal-answer questions).
  const decimalDigits: number[] = [];
  if (question.answer.kind === 'decimal') {
    let r = integerRemainder;
    for (let i = 0; i < shape.decimalBoxes && r !== 0; i += 1) {
      r *= 10;
      const d = Math.floor(r / absDiv);
      decimalDigits.push(d);
      values.set(`dec-${i}`, d);
      r -= d * absDiv;
    }
  }

  // Remainder digits → `rem-N`, left → right.
  if (question.answer.kind === 'remainder') {
    const remDigits = String(integerRemainder).split('').map(Number);
    for (let i = 0; i < remDigits.length && i < shape.remainderBoxes; i += 1) {
      values.set(`rem-${i}`, remDigits[i]);
    }
  }

  // For long-division layout, also populate the staircase draft grid.
  const bringDownCells = new Set<string>();
  if (layout === 'divisionLong') {
    fillLongDivisionDraft({
      dividend: absD,
      divisor: absDiv,
      integerQuotientDigits: intDigits,
      decimalQuotientDigits: decimalDigits,
      values,
      bringDownCells,
    });
  }
  return { values, borrows: [], bringDownCells };
}

function fillLongDivisionDraft(args: {
  dividend: number;
  divisor: number;
  integerQuotientDigits: number[];
  decimalQuotientDigits: number[];
  values: Map<string, number>;
  bringDownCells: Set<string>;
}) {
  const {
    dividend,
    divisor,
    integerQuotientDigits,
    decimalQuotientDigits,
    values,
    bringDownCells,
  } = args;
  const dividendDigits = String(dividend).split('').map(Number);
  const offset = dividendDigits.length - integerQuotientDigits.length;
  const allQDigits = [...integerQuotientDigits, ...decimalQuotientDigits];
  const integerSteps = integerQuotientDigits.length;
  const totalSteps = allQDigits.length;
  const columns = dividendDigits.length;
  const divisorDigits = String(divisor).length;
  const layoutOptions = {
    divisorDigits,
    integerQuotientDigits: integerSteps,
  };

  // Pre-load the running chunk with the first `offset` dividend digits —
  // for `13032 ÷ 24` (offset 2) that's `13`, so step 0's bring-down lands us
  // at `130` ready for division.
  let chunk = 0;
  for (let i = 0; i < offset; i += 1) {
    chunk = chunk * 10 + dividendDigits[i];
  }

  for (let q = 0; q < totalSteps; q += 1) {
    const isIntStep = q < integerSteps;
    const broughtDown = isIntStep ? dividendDigits[q + offset] : 0;
    chunk = chunk * 10 + broughtDown;

    const qDigit = allQDigits[q];
    const product = qDigit * divisor;
    const diff = chunk - product;
    chunk = diff;

    // Divisor-carry boxes: the carries generated while multiplying
    // `qDigit × divisor` digit-by-digit (units → leftward). The carry out of
    // the divisor digit at position `pos` from the right is written above the
    // digit one column to its left → from-left col `divisorDigits - 2 - pos`.
    {
      let dcarry = 0;
      let dv = divisor;
      for (let pos = 0; pos < divisorDigits; pos += 1) {
        const stepProduct = (dv % 10) * qDigit + dcarry;
        const nextCarry = Math.floor(stepProduct / 10);
        if (pos < divisorDigits - 1 && nextCarry > 0) {
          values.set(`dcarry-${q}-${divisorDigits - 2 - pos}`, nextCarry);
        }
        dcarry = nextCarry;
        dv = Math.floor(dv / 10);
      }
    }

    const prodRow = 2 * q;
    const diffRow = 2 * q + 1;
    const rightCol = q + offset;
    writeRightAligned(values, prodRow, rightCol, product, columns, layoutOptions);
    writeRightAligned(values, diffRow, rightCol, diff, columns, layoutOptions);

    // Brought-down digit appears at the right edge of the diff row when
    // another step follows (integer bring-down, or 0 for decimal expansion).
    if (q + 1 < totalSteps) {
      const nextBrought =
        q + 1 < integerSteps ? dividendDigits[q + 1 + offset] : 0;
      const bringDownId = `dd-${diffRow}-${rightCol + 1}`;
      values.set(bringDownId, nextBrought);
      bringDownCells.add(bringDownId);
    }
  }
}

/** Write `num`'s digits into row `row`, right-aligned at column `rightCol`.
 *  Math-aware row layout ensures wide products (e.g. small dividend ÷ wide
 *  divisor in decimal mode) keep their leading digit instead of being
 *  clipped to the pair-shift default startCol. */
function writeRightAligned(
  values: Map<string, number>,
  row: number,
  rightCol: number,
  num: number,
  columns: number,
  options: { divisorDigits: number; integerQuotientDigits: number },
) {
  const str = String(num);
  const layout = divisionDraftRowLayout(row, columns, options);
  for (let i = 0; i < str.length; i += 1) {
    const col = rightCol - (str.length - 1 - i);
    if (col >= layout.startCol) {
      values.set(`dd-${row}-${col}`, Number(str[i]));
    }
  }
}
