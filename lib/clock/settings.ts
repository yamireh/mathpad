/** Clock session settings + result shapes. */
import type {
  ClockAnswerType,
  ClockComplexity,
  ClockJump,
  ClockSkill,
} from './types';
import type { ClockQuestion } from './question';

export interface ClockSettings {
  questionCount: number;
  /** What to practise: read / set the hands / time after–before. */
  skill: ClockSkill;
  /** How to answer (read & elapsed): write / say / set / mixed. */
  type: ClockAnswerType;
  /** Minute granularity of the times shown ('any' blends all three). */
  step: ClockComplexity;
  /** Elapsed jump size (only used when skill is 'elapsed'). */
  jump: ClockJump;
}

export function defaultClockSettings(): ClockSettings {
  return {
    questionCount: 10,
    skill: 'read',
    type: 'digital',
    step: 'quarter',
    jump: 'hour',
  };
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
  skill: ClockSkill;
  type: ClockAnswerType;
  step: ClockComplexity;
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
    skill: settings.skill,
    type: settings.type,
    step: settings.step,
    total: results.length,
    correct: results.filter((r) => r.correct).length,
    corrected: results.filter((r) => r.fixed).length,
  };
}
