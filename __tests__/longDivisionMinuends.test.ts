/**
 * Per-step long-division subtraction minuends — the chunk above each product
 * that borrowing operates on. Locks the digit/column/borrow geometry.
 */
import {
  longDivisionStepMinuends,
  type LongDivisionStepMinuend,
} from '../components/domain/layout';
import type { Question } from '../types';

const divisionQuestion = (
  operands: [number, number],
  answer: Question['answer'],
): Question => ({
  id: 'q',
  operation: 'division',
  operands,
  answer,
  layout: 'divisionLong',
});

describe('longDivisionStepMinuends', () => {
  it('520 ÷ 38 = 13 r26 — both steps need a borrow', () => {
    const q = divisionQuestion([520, 38], {
      kind: 'remainder',
      quotient: 13,
      remainder: 26,
    });
    expect(longDivisionStepMinuends(q)).toEqual<LongDivisionStepMinuend[]>([
      // 52 − (1×38) → 2 < 8, borrows. Chunk lives in the dividend header.
      {
        step: 0,
        digits: [5, 2],
        cols: [0, 1],
        inDividend: true,
        diffRow: -1,
        needsBorrow: true,
      },
      // 140 − (3×38=114) → 0 < 4, borrows. Chunk lives in diff row 1.
      {
        step: 1,
        digits: [1, 4, 0],
        cols: [0, 1, 2],
        inDividend: false,
        diffRow: 1,
        needsBorrow: true,
      },
    ]);
  });

  it('flags steps that need no borrow', () => {
    // 936 ÷ 3 = 312: every step subtracts an exact multiple, no borrow.
    const q = divisionQuestion([936, 3], { kind: 'integer', value: 312 });
    const steps = longDivisionStepMinuends(q);
    expect(steps.map((s) => s.needsBorrow)).toEqual([false, false, false]);
    expect(steps[0].inDividend).toBe(true);
    expect(steps[1].diffRow).toBe(1);
  });

  it('is empty for non-division questions', () => {
    const q: Question = {
      id: 'q',
      operation: 'subtraction',
      operands: [52, 38],
      answer: { kind: 'integer', value: 14 },
      layout: 'vertical',
    };
    expect(longDivisionStepMinuends(q)).toEqual([]);
  });
});
