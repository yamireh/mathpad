import { emptyAnswerInk } from '../components/domain/ink';
import { answerShape } from '../components/domain/layout';
import { nextHint, nextStep } from '../lib/hints';
import type { Question } from '../types';

const sub = (operands: [number, number], value: number): Question => ({
  id: 'q',
  operation: 'subtraction',
  operands,
  answer: { kind: 'integer', value },
  layout: 'vertical',
});

const inkFor = (q: Question) => emptyAnswerInk(answerShape(q));

describe('nextHint', () => {
  it('tier 1 gives the orient message for the operation', () => {
    const q = sub([52, 8], 44);
    expect(nextHint(q, q.layout, inkFor(q), 1).messageKey).toBe(
      'hints.orient.subtraction',
    );
  });

  it('tier 2 tells the kid to borrow when the column underflows', () => {
    const q = sub([52, 8], 44); // units 2 − 8 needs a borrow
    expect(nextHint(q, q.layout, inkFor(q), 2).messageKey).toBe(
      'hints.method.subtractionBorrow',
    );
  });

  it('tier 2 is plain subtraction when no borrow is needed', () => {
    const q = sub([58, 6], 52); // units 8 − 6, no borrow
    expect(nextHint(q, q.layout, inkFor(q), 2).messageKey).toBe(
      'hints.method.subtraction',
    );
  });

  it('uses the operation-specific method key for other operations', () => {
    const add: Question = {
      id: 'a',
      operation: 'addition',
      operands: [12, 34],
      answer: { kind: 'integer', value: 46 },
      layout: 'vertical',
    };
    expect(nextHint(add, add.layout, inkFor(add), 2).messageKey).toBe(
      'hints.method.addition',
    );
  });
});

describe('nextStep', () => {
  it('reveals the correct digit for the frontier (units) box', () => {
    const q = sub([52, 8], 44); // 52 − 8 = 44, units digit is 4
    expect(nextStep(q, q.layout, inkFor(q))).toEqual({
      boxId: 'int-1',
      digit: 4,
    });
  });
});
