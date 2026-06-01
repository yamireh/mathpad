/**
 * Auto-advance fill order for the practice workspace. Given the answer
 * shape, the chosen layout, expected per-column carries, and (for
 * multi-digit ×) the partial-product geometry, returns the ordered list
 * of box ids the kid is expected to write into. The writing pad uses
 * this list to auto-advance focus after each digit lands.
 */
import {
  type AnswerShape,
  divisionDraftRowLayout,
  partialMultiplicationCarries,
} from '../layout';
import type { ProblemLayout } from '../../../types';
import type { MultiplicationInfo } from './boxIds';

export interface DivisionDraftMeta {
  rows: number;
  columns: number;
  divisorDigits: number;
  /**
   * Per quotient step, the divisor columns (from left) that get a carry box,
   * in fill order. From {@link longDivisionDivisorCarries}. Optional —
   * absent/short entries just mean no divisor-carry boxes for that step.
   */
  divisorCarryCols?: number[][];
}

/**
 * Build the auto-advance sequence. For a vertical +/× problem, each sum
 * answer box is followed by the carry box above the column to its left
 * when the math actually generates a carry. For multi-digit multiplication,
 * the kid walks each partial product first (units → leftmost), with the
 * per-step times-carry `tcarry-{row}-{op1Col}` slot interleaved between
 * partial cells whenever that step generates a carry into op1's next
 * column. The final-sum walk follows the addition pattern.
 */
export function fillSequence(
  shape: AnswerShape,
  layout: ProblemLayout,
  expectedCarries: boolean[] | null,
  mult: MultiplicationInfo | null,
  divisionDraft: DivisionDraftMeta | null,
): string[] {
  if (layout !== 'vertical' || !expectedCarries) {
    return nonVerticalSequence(shape, layout, divisionDraft);
  }
  return verticalSequence(shape, expectedCarries, mult);
}

/** Vertical-layout walk (addition / subtraction / multiplication). */
function verticalSequence(
  shape: AnswerShape,
  expectedCarries: boolean[],
  mult: MultiplicationInfo | null,
): string[] {
  const seq: string[] = [];
  if (mult) seq.push(...multiplicationPartials(mult));
  for (let r = 0; r < shape.integerBoxes; r += 1) {
    const intCol = shape.integerBoxes - 1 - r;
    seq.push(`int-${intCol}`);
    const carryCol = intCol - 1;
    if (carryCol >= 0 && expectedCarries[carryCol]) {
      seq.push(`carry-${carryCol}`);
    }
  }
  for (let i = 0; i < shape.decimalBoxes; i += 1) seq.push(`dec-${i}`);
  for (let i = 0; i < shape.remainderBoxes; i += 1) seq.push(`rem-${i}`);
  return seq;
}

/** Partial-product walk for multi-digit × (units → leftmost, with tcarries). */
function multiplicationPartials(mult: MultiplicationInfo): string[] {
  const seq: string[] = [];
  const { op1, op2, op1Cols, partials } = mult;
  let op2Remaining = Math.abs(op2);
  for (let r = 0; r < partials.length; r += 1) {
    const width = partials[r];
    const d = op2Remaining % 10;
    op2Remaining = Math.floor(op2Remaining / 10);
    const carries = partialMultiplicationCarries(op1, d, op1Cols);
    for (let pos = 0; pos < op1Cols; pos += 1) {
      seq.push(`pp-${r}-${width - 1 - pos}`);
      if (pos < op1Cols - 1 && carries[pos]) {
        seq.push(`tcarry-${r}-${op1Cols - 2 - pos}`);
      }
    }
    if (width > op1Cols) seq.push(`pp-${r}-0`);
  }
  return seq;
}

/** Non-vertical walks: division (in-row, decimal, or long) and fallthrough. */
function nonVerticalSequence(
  shape: AnswerShape,
  layout: ProblemLayout,
  divisionDraft: DivisionDraftMeta | null,
): string[] {
  const order: string[] = [];
  const isDivision =
    layout === 'divisionLong' ||
    layout === 'divisionHorizontal' ||
    layout === 'divisionDecimal';
  if (isDivision && divisionDraft && divisionDraft.rows > 0) {
    order.push(...longDivisionSequence(shape, divisionDraft));
    for (let i = 0; i < shape.remainderBoxes; i += 1) order.push(`rem-${i}`);
    return order;
  }
  if (isDivision) {
    for (let i = 0; i < shape.integerBoxes; i += 1) order.push(`int-${i}`);
  } else {
    // Vertical layout with no expected carries (subtraction) — right-to-left.
    for (let i = shape.integerBoxes - 1; i >= 0; i -= 1) order.push(`int-${i}`);
  }
  for (let i = 0; i < shape.decimalBoxes; i += 1) order.push(`dec-${i}`);
  for (let i = 0; i < shape.remainderBoxes; i += 1) order.push(`rem-${i}`);
  return order;
}

/**
 * Long-division walk: for each quotient digit (integer then decimal),
 * write the digit then walk the product row + difference row, units
 * first. The difference row is one cell wider to hold the brought-down
 * digit on its right edge.
 */
function longDivisionSequence(
  shape: AnswerShape,
  divisionDraft: DivisionDraftMeta,
): string[] {
  const order: string[] = [];
  const offset = Math.max(0, divisionDraft.columns - shape.integerBoxes);
  const totalSteps = shape.integerBoxes + shape.decimalBoxes;
  for (let q = 0; q < totalSteps; q += 1) {
    const isDecimalStep = q >= shape.integerBoxes;
    order.push(isDecimalStep ? `dec-${q - shape.integerBoxes}` : `int-${q}`);
    const prodRow = 2 * q;
    const diffRow = 2 * q + 1;
    const rightCol = q + offset;
    // The kid multiplies quotient × divisor while writing the product row
    // (units first); each divisor-carry box is filled right after the product
    // cell whose digit produced it — so focus flows answer → product → carry,
    // not answer → carry.
    pushDraftRow(order, prodRow, rightCol, false, shape, divisionDraft, {
      step: q,
      cols: divisionDraft.divisorCarryCols?.[q] ?? [],
    });
    // The difference row only gains a brought-down digit when another step
    // follows — the final step's difference is the remainder, with nothing
    // left to bring down.
    pushDraftRow(order, diffRow, rightCol, q + 1 < totalSteps, shape, divisionDraft);
  }
  return order;
}

/**
 * Push one draft row's cells (right→left, units-first) into `order`. For the
 * product row, `carry` interleaves each divisor-carry box right after the
 * product cell that generates it: the cell `i` columns left of `rightCol`
 * corresponds to multiplying the divisor digit at position `i` from the
 * right, whose carry sits above the divisor digit one column further left
 * (from-left col `divisorDigits - 2 - i`).
 */
function pushDraftRow(
  order: string[],
  row: number,
  rightCol: number,
  withBroughtDown: boolean,
  shape: AnswerShape,
  divisionDraft: DivisionDraftMeta,
  carry?: { step: number; cols: number[] },
): void {
  if (row >= divisionDraft.rows) return;
  const { startCol, cellCount } = divisionDraftRowLayout(
    row,
    divisionDraft.columns,
    {
      divisorDigits: divisionDraft.divisorDigits,
      integerQuotientDigits: shape.integerBoxes,
    },
  );
  const lastCol = startCol + cellCount - 1;
  // The row's own digits (product, or the difference) end at `rightCol`,
  // walked units-first. The brought-down digit, when present, sits one column
  // to the right and is filled LAST — after the subtraction is written — so
  // focus flows product → difference → bring-down, never jumping right early.
  const mainMaxCol = Math.min(lastCol, rightCol);
  for (let c = mainMaxCol; c >= startCol; c -= 1) {
    order.push(`dd-${row}-${c}`);
    if (carry) {
      const i = rightCol - c; // position from the right (units = 0)
      const col = divisionDraft.divisorDigits - 2 - i;
      if (i >= 0 && col >= 0 && carry.cols.includes(col)) {
        order.push(`dcarry-${carry.step}-${col}`);
      }
    }
  }
  if (withBroughtDown && rightCol + 1 <= lastCol) {
    order.push(`dd-${row}-${rightCol + 1}`);
  }
}
