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
  partialMultiplicationCarries,
  partialWidths,
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
  let a = Math.abs(op1);
  let b = Math.abs(op2);
  let carry = 0;
  // Column-wise sum, right → left. Each column writes its result digit and,
  // when it generates a carry, lights up the carry box above the column to
  // its left.
  for (let col = shape.integerBoxes - 1; col >= 0; col -= 1) {
    const d1 = a % 10;
    const d2 = b % 10;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    const total = d1 + d2 + carry;
    values.set(`int-${col}`, total % 10);
    const nextCarry = Math.floor(total / 10);
    if (nextCarry > 0 && col - 1 >= 0) {
      values.set(`carry-${col - 1}`, nextCarry);
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

  // Top-operand digits (most-significant first), padded to integerBoxes.
  // Assume op1 >= op2 (the generator enforces this for non-negative mode).
  const digits = String(Math.abs(op1))
    .padStart(shape.integerBoxes, '0')
    .split('')
    .map(Number);
  const subtrahend = String(Math.abs(op2))
    .padStart(shape.integerBoxes, '0')
    .split('')
    .map(Number);

  // Walk right → left, tapping the column to the left of each column that
  // would underflow. `computeBorrowDisplay` handles cascade (e.g. tapping a
  // 0 column drags another borrow further left), so we only ever tap the
  // immediate left neighbour.
  const borrows: number[] = [];
  for (let i = shape.integerBoxes - 1; i >= 0; i -= 1) {
    const display = computeBorrowDisplay(digits, borrows);
    if (display[i].value < subtrahend[i] && i - 1 >= 0) {
      borrows.push(i - 1);
    }
  }

  // Result digits: adjusted top digit − subtrahend digit per column.
  const finalDisplay = computeBorrowDisplay(digits, borrows);
  for (let i = 0; i < shape.integerBoxes; i += 1) {
    const r = finalDisplay[i].value - subtrahend[i];
    if (r >= 0) values.set(`int-${i}`, r);
  }
  return { values, borrows, bringDownCells: new Set() };
}

/* -------------------------------------------------------------------------- */
/* Multiplication                                                               */
/* -------------------------------------------------------------------------- */

function solveMultiplication(question: Question): SolvePlan {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const partials = partialWidths(op1, op2);
  if (partials) {
    return solveMultiplicationMultiDigit(question);
  }
  // Single-digit multiplier: column-wise multiply, carrying like addition.
  const values = new Map<string, number>();
  let a = Math.abs(op1);
  const m = Math.abs(op2);
  let carry = 0;
  for (let col = shape.integerBoxes - 1; col >= 0; col -= 1) {
    const d = a % 10;
    a = Math.floor(a / 10);
    const total = d * m + carry;
    values.set(`int-${col}`, total % 10);
    const nextCarry = Math.floor(total / 10);
    if (nextCarry > 0 && col - 1 >= 0) {
      values.set(`carry-${col - 1}`, nextCarry);
    }
    carry = nextCarry;
  }
  return { values, borrows: [], bringDownCells: new Set() };
}

function solveMultiplicationMultiDigit(question: Question): SolvePlan {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const partials = partialWidths(op1, op2);
  if (!partials)
    return { values: new Map(), borrows: [], bringDownCells: new Set() };
  const op1Cols = digitCount(op1);
  const values = new Map<string, number>();

  // Per partial row: write each digit of (op1 × digit_r) right-to-left,
  // and place each step's carry into the `tcarry-{row}-{op1Col}` slot
  // when the math actually produces one.
  let m = Math.abs(op2);
  for (let r = 0; r < partials.length; r += 1) {
    const width = partials[r];
    const d = m % 10;
    m = Math.floor(m / 10);
    if (d === 0) {
      values.set(`pp-${r}-${width - 1}`, 0);
      continue;
    }
    const tcarries = partialMultiplicationCarries(op1, d, op1Cols);
    let a = Math.abs(op1);
    let carry = 0;
    for (let pos = 0; pos < op1Cols; pos += 1) {
      const digit = a % 10;
      a = Math.floor(a / 10);
      const total = digit * d + carry;
      const cellCol = width - 1 - pos;
      values.set(`pp-${r}-${cellCol}`, total % 10);
      const nextCarry = Math.floor(total / 10);
      // Times-carry slots live for positions 0..op1Cols-2; index pos's
      // carry goes into the (op1Cols - 2 - pos) slot.
      if (pos < op1Cols - 1 && tcarries[pos]) {
        values.set(`tcarry-${r}-${op1Cols - 2 - pos}`, nextCarry);
      }
      carry = nextCarry;
    }
    if (width > op1Cols && carry > 0) {
      values.set(`pp-${r}-0`, carry);
    }
  }

  // Final sum row: just write the digits of the answer.
  const product = Math.abs(op1) * Math.abs(op2);
  const sumDigits = String(product).padStart(shape.integerBoxes, '0').split('').map(Number);
  // Compute final-sum carries between columns (across all partials).
  const partialValues: number[] = [];
  let m2 = Math.abs(op2);
  let shift = 1;
  while (m2 > 0) {
    partialValues.push(Math.abs(op1) * (m2 % 10) * shift);
    m2 = Math.floor(m2 / 10);
    shift *= 10;
  }
  const carries = multiOperandCarriesFromLeft(partialValues, shape.integerBoxes);
  for (let i = 0; i < shape.integerBoxes; i += 1) {
    values.set(`int-${i}`, sumDigits[i]);
    if (i - 1 >= 0 && carries[i - 1]) {
      // carries[N] = does column N receive a carry from the right?
      // Same convention as fillSequence: carry-N is the carry above column N.
      // We don't have the exact carry digit here; recompute it.
    }
  }
  // Carry digits across final sum.
  let acc = 0;
  const remaining = partialValues.map((v) => v);
  for (let pos = 0; pos < shape.integerBoxes; pos += 1) {
    let s = acc;
    for (let i = 0; i < remaining.length; i += 1) {
      s += remaining[i] % 10;
      remaining[i] = Math.floor(remaining[i] / 10);
    }
    const nextCarry = Math.floor(s / 10);
    if (nextCarry > 0) {
      const carryCol = shape.integerBoxes - 2 - pos;
      if (carryCol >= 0) values.set(`carry-${carryCol}`, nextCarry);
    }
    acc = nextCarry;
  }

  return { values, borrows: [], bringDownCells: new Set() };
}

/** For N column-sum operands and `cols` columns, returns per-column
 *  flags marking which columns receive a non-zero carry from the right. */
function multiOperandCarriesFromLeft(operands: number[], cols: number): boolean[] {
  const out = new Array<boolean>(cols).fill(false);
  const remaining = operands.map((o) => Math.abs(o));
  let carry = 0;
  for (let pos = 0; pos < cols; pos += 1) {
    let s = carry;
    for (let i = 0; i < remaining.length; i += 1) {
      s += remaining[i] % 10;
      remaining[i] = Math.floor(remaining[i] / 10);
    }
    const nextCarry = Math.floor(s / 10);
    if (nextCarry > 0) {
      const receiver = cols - 2 - pos;
      if (receiver >= 0) out[receiver] = true;
    }
    carry = nextCarry;
  }
  return out;
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
