/**
 * Long-division auto-advance order. Locks the per-step walk:
 *   quotient digit → product row (units-first, divisor-carry interleaved
 *   right after the cell that generates it) → difference row → brought-down
 *   digit LAST, and only when another step follows.
 */
import type { AnswerShape } from '../components/domain/layout';
import {
  fillSequence,
  type DivisionDraftMeta,
} from '../components/domain/workspace/fillSequence';

const shape = (over: Partial<AnswerShape>): AnswerShape => ({
  hasSign: false,
  integerBoxes: 1,
  decimalBoxes: 0,
  remainderBoxes: 0,
  ...over,
});

describe('fillSequence — long division', () => {
  it('13032 ÷ 24: product then carry, difference then bring-down', () => {
    // 5 dividend digits, 3-digit quotient (543), 2-digit divisor, every step
    // carries above the divisor tens digit (from-left col 0).
    const meta: DivisionDraftMeta = {
      columns: 5,
      rows: 6,
      divisorDigits: 2,
      divisorCarryCols: [[0], [0], [0]],
    };
    const order = fillSequence(
      shape({ integerBoxes: 3 }),
      'divisionLong',
      null,
      null,
      meta,
    );
    // Step 0: quotient, product (units first) with the carry right after the
    // units product cell, then the difference, then the brought-down digit.
    expect(order.slice(0, 9)).toEqual([
      'int-0',
      'dd-0-2', // product units
      'dcarry-0-0', // carry above the divisor, right after the units product
      'dd-0-1',
      'dd-0-0',
      'dd-1-2', // difference (units first), below the product
      'dd-1-1',
      'dd-1-0',
      'dd-1-3', // brought-down digit LAST
    ]);
  });

  it('single step (no further dividend digits) omits the bring-down cell', () => {
    // e.g. 500 ÷ 80 = 6 r20 — one step, 3-digit product, no digit to bring
    // down, so the difference row must not walk a 4th (bring-down) cell.
    const meta: DivisionDraftMeta = {
      columns: 3,
      rows: 2,
      divisorDigits: 2,
      divisorCarryCols: [[]],
    };
    const order = fillSequence(
      shape({ integerBoxes: 1, remainderBoxes: 2 }),
      'divisionLong',
      null,
      null,
      meta,
    );
    expect(order).not.toContain('dd-1-3');
    // Difference sits directly below the product (cols 2→0), nothing to the right.
    const diffCells = order.filter((id) => id.startsWith('dd-1-'));
    expect(diffCells).toEqual(['dd-1-2', 'dd-1-1', 'dd-1-0']);
  });
});
