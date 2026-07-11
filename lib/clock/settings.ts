/** Clock session settings + result shapes. */
import type { ClockAnswerType, ClockStep } from './types';
import type { ClockQuestion } from './question';

export interface ClockSettings {
  questionCount: number;
  step: ClockStep;
  type: ClockAnswerType;
}

export function defaultClockSettings(): ClockSettings {
  return { questionCount: 10, step: 'quarter', type: 'digital' };
}

/** Outcome of one answered clock question. */
export interface ClockResult {
  question: ClockQuestion;
  correct: boolean;
  /** The child's answer, formatted for display ("6:35", "half past 6", "—"). */
  given: string;
  /** Got it right on a later try after first being wrong. */
  fixed?: boolean;
}
