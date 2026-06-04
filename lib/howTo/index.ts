/**
 * Fixed "How to solve" demo questions — one per operation, each hand-picked to
 * exercise that operation's full method (carrying, borrowing incl. across a
 * zero, partial products, long-division bring-down + borrow). Shown on the
 * How-to screen, where the animated solver walks through them as a worked
 * example. Mix has no demo (it just reshuffles the four).
 */
import type { Operation, Question } from '../../types';

const QUESTIONS: Record<Exclude<Operation, 'mix'>, Question> = {
  addition: {
    id: 'howto-addition',
    operation: 'addition',
    operands: [367, 458],
    answer: { kind: 'integer', value: 825 },
    layout: 'vertical',
  },
  subtraction: {
    id: 'howto-subtraction',
    operation: 'subtraction',
    operands: [502, 367],
    answer: { kind: 'integer', value: 135 },
    layout: 'vertical',
  },
  multiplication: {
    id: 'howto-multiplication',
    operation: 'multiplication',
    operands: [47, 36],
    answer: { kind: 'integer', value: 1692 },
    layout: 'vertical',
  },
  division: {
    id: 'howto-division',
    operation: 'division',
    operands: [512, 4],
    answer: { kind: 'integer', value: 128 },
    layout: 'divisionLong',
  },
};

/** The demo question for an operation, or null for Mix (no How-to). */
export function howToQuestion(operation: Operation): Question | null {
  return operation === 'mix' ? null : QUESTIONS[operation];
}
