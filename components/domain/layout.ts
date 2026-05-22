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

/** Font size for printed problem digits. */
export const PROBLEM_DIGIT_SIZE = 38;

/** Width reserved for the operator to the left of the second operand. */
export const OPERATOR_COLUMN_WIDTH = 44;

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
  if (question.operation === 'division') {
    return {
      hasSign: false,
      integerBoxes: 1,
      decimalBoxes: answer.kind === 'decimal' ? 1 : 0,
      remainderBoxes: answer.kind === 'remainder' ? 1 : 0,
    };
  }
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
