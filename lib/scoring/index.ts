/**
 * Scoring.
 *
 * Pure marking logic (SPEC.md § Scoring rules). Marking depends exclusively on
 * the recognised answer-box digits — never on scratch work. Decimal answers are
 * compared by mathematical value so trailing zeros do not matter
 * (`3 = 3.0 = 3.00`).
 */
import type {
  Question,
  QuestionResult,
  QuestionStatus,
  SubmittedAnswer,
} from '../../types';

/** Float comparison tolerance for decimal answers. */
const EPSILON = 1e-9;

/**
 * Concatenate a row of digit boxes into an integer.
 * Returns null if the row is empty or any box is blank (incomplete = wrong).
 */
function digitsToInt(digits: (number | null)[]): number | null {
  if (digits.length === 0) return null;
  if (digits.some((d) => d === null)) return null;
  return Number(digits.map((d) => String(d)).join(''));
}

/**
 * Read decimal boxes left→right into a fractional value (e.g. [7,5] → 0.75).
 * Trailing blank boxes are allowed; a filled box *after* a blank one is an
 * invalid (ambiguous) entry and returns null.
 */
function readDecimalBoxes(boxes: (number | null)[]): number | null {
  let text = '';
  let ended = false;
  for (const box of boxes) {
    if (box === null) {
      ended = true;
      continue;
    }
    if (ended) return null; // gap: filled box follows a blank box
    text += String(box);
  }
  if (text === '') return 0;
  return Number(text) / Math.pow(10, text.length);
}

/**
 * Mark a single question. A `null` submission (never attempted) is wrong.
 */
export function isAnswerCorrect(
  question: Question,
  submitted: SubmittedAnswer | null,
): boolean {
  if (!submitted) return false;
  const { answer } = question;

  switch (answer.kind) {
    case 'integer': {
      // Sign and digits must both match (SPEC marking edge cases).
      const negativeExpected = answer.value < 0;
      const hasMinus = submitted.sign === 'minus';
      if (negativeExpected !== hasMinus) return false;

      const magnitude = digitsToInt(submitted.integerDigits);
      if (magnitude === null) return false;
      if (magnitude !== Math.abs(answer.value)) return false;

      // An integer question expects no decimal digits.
      if (submitted.decimalDigits.some((d) => d !== null && d !== 0)) {
        return false;
      }
      return true;
    }

    case 'remainder': {
      if (submitted.sign === 'minus') return false;
      const quotient = digitsToInt(submitted.integerDigits);
      const remainder = digitsToInt(submitted.remainderDigits);
      if (quotient === null || remainder === null) return false;
      return quotient === answer.quotient && remainder === answer.remainder;
    }

    case 'decimal': {
      if (submitted.sign === 'minus') return false;
      const integerPart = digitsToInt(submitted.integerDigits);
      if (integerPart === null) return false;
      const fraction = readDecimalBoxes(submitted.decimalDigits);
      if (fraction === null) return false;
      // Mathematical equivalence: compare numeric value, not written form.
      return Math.abs(integerPart + fraction - answer.value) < EPSILON;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Status                                                                       */
/* -------------------------------------------------------------------------- */

/** Status assigned at the first Finish. */
export function firstAttemptStatus(correct: boolean): QuestionStatus {
  return correct ? 'correct_first_try' : 'wrong';
}

/**
 * Status after a review/edit resubmission. A first-try-correct question stays
 * locked; a wrong one becomes `fixed` when corrected (SPEC: the final score
 * only ever rises).
 */
export function statusAfterEdit(
  current: QuestionStatus,
  nowCorrect: boolean,
): QuestionStatus {
  if (current === 'correct_first_try') return 'correct_first_try';
  return nowCorrect ? 'fixed' : 'wrong';
}

/** Whether a status counts as correct for the final score. */
export function isCorrectStatus(status: QuestionStatus): boolean {
  return status === 'correct_first_try' || status === 'fixed';
}

/* -------------------------------------------------------------------------- */
/* Aggregate scoring                                                            */
/* -------------------------------------------------------------------------- */

/** Mark a freshly finished session, producing per-question results. */
export function markFirstAttempt(
  questions: Question[],
  answers: (SubmittedAnswer | null)[],
): QuestionResult[] {
  return questions.map((question, i) => {
    const submittedAnswer = answers[i] ?? null;
    return {
      question,
      submittedAnswer,
      status: firstAttemptStatus(isAnswerCorrect(question, submittedAnswer)),
    };
  });
}

/** First-try score — correct-on-first-attempt count. Never changes. */
export function countFirstTry(results: QuestionResult[]): number {
  return results.filter((r) => r.status === 'correct_first_try').length;
}

/** Final score — correct-first-try plus fixed. */
export function countFinal(results: QuestionResult[]): number {
  return results.filter((r) => isCorrectStatus(r.status)).length;
}

/** Whole-number percentage, guarding against an empty session. */
export function scorePercent(score: number, total: number): number {
  return total <= 0 ? 0 : Math.round((score / total) * 100);
}

/** i18n key for the Score-screen encouragement line. */
export type EncouragementKey = 'perfect' | 'great' | 'nice' | 'effort';

/** Pick the encouragement tier from the final score (SPEC § Score). */
export function encouragementKey(
  score: number,
  total: number,
): EncouragementKey {
  if (total <= 0) return 'effort';
  const pct = (score / total) * 100;
  if (pct >= 100) return 'perfect';
  if (pct >= 70) return 'great';
  if (pct >= 40) return 'nice';
  return 'effort';
}
