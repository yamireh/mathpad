/**
 * Display formatting for questions and answers (digits only — never ink).
 */
import type { Question, QuestionAnswer, SubmittedAnswer } from '../../types';
import { operatorSymbol } from './layout';

/** A question as an inline string, e.g. "24 + 18" or "13 ÷ 4". */
export function formatProblem(question: Question): string {
  const [a, b] = question.operands;
  return `${a} ${operatorSymbol[question.operation]} ${b}`;
}

/** The correct answer as a string, e.g. "42", "−3", "3 R 1", "3.75". */
export function formatAnswer(answer: QuestionAnswer): string {
  switch (answer.kind) {
    case 'integer':
      return formatInteger(answer.value);
    case 'remainder':
      return `${answer.quotient} R ${answer.remainder}`;
    case 'decimal':
      return answer.value.toFixed(answer.decimalPlaces);
  }
}

/** Integer with a true minus sign for negatives. */
function formatInteger(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

/** Join a row of digit boxes; a blank box shows as a middle dot. */
function joinDigits(digits: (number | null)[]): string {
  return digits.map((d) => (d === null ? '·' : String(d))).join('');
}

/** Whether a submission is entirely blank. */
export function isBlankSubmission(submitted: SubmittedAnswer | null): boolean {
  if (!submitted) return true;
  const { sign, integerDigits, decimalDigits, remainderDigits } = submitted;
  return (
    sign === null &&
    [...integerDigits, ...decimalDigits, ...remainderDigits].every(
      (d) => d === null,
    )
  );
}

/**
 * The kid's submitted answer as a string, or null if completely blank.
 * Blank boxes inside a partial answer render as `·`.
 */
export function formatSubmittedAnswer(
  question: Question,
  submitted: SubmittedAnswer | null,
): string | null {
  if (isBlankSubmission(submitted) || !submitted) return null;
  const sign = submitted.sign === 'minus' ? '−' : '';
  const integer = joinDigits(submitted.integerDigits);

  switch (question.answer.kind) {
    case 'remainder':
      return `${integer} R ${joinDigits(submitted.remainderDigits)}`;
    case 'decimal': {
      const decimals = submitted.decimalDigits
        .filter((d) => d !== null)
        .map(String)
        .join('');
      return `${sign}${integer}${decimals ? `.${decimals}` : ''}`;
    }
    default:
      return `${sign}${integer}`;
  }
}
