/** Clock session settings + result shapes. */
import type { ClockAnswerType, ClockStep } from './types';
import type { ClockQuestion } from './question';

export interface ClockSettings {
  questionCount: number;
  step: ClockStep;
  type: ClockAnswerType;
}

export function defaultClockSettings(): ClockSettings {
  return { questionCount: 10, step: 'quarter', type: 'mixed' };
}

/** Outcome of one answered clock question. */
export interface ClockResult {
  question: ClockQuestion;
  correct: boolean;
}
