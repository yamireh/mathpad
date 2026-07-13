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

/** A finished clock session, summarised for local history + the parent cloud. */
export interface ClockSession {
  id: string;
  completedAt: string;
  type: ClockAnswerType;
  step: ClockStep;
  total: number;
  /** Correct after any fixes. */
  correct: number;
  /** Wrong first, then corrected on a later try. */
  corrected: number;
}

/** Summarise a finished run (with its fixes applied) into a history record. */
export function summariseClockSession(
  results: ClockResult[],
  settings: ClockSettings,
  id: string,
  completedAt: string,
): ClockSession {
  return {
    id,
    completedAt,
    type: settings.type,
    step: settings.step,
    total: results.length,
    correct: results.filter((r) => r.correct).length,
    corrected: results.filter((r) => r.fixed).length,
  };
}
