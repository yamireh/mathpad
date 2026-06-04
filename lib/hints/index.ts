/**
 * Progressive hints — pure logic for the practice "Hint" helper.
 *
 * Hints escalate per tap on the same question (Slice A = guidance only, never
 * reveals an answer):
 *   tier 1 — orient: where to start.
 *   tier 2 — method: how to tackle this column (borrow-aware for subtraction).
 *
 * Reuses the solver plan so the method hint matches what the column actually
 * needs. No React; unit-testable.
 */
import { frontierBox, type AnswerInk } from '../../components/domain/ink';
import { answerShape } from '../../components/domain/layout';
import { computeSolvePlan } from '../solver/solveValues';
import type { ProblemLayout, Question } from '../../types';

/** Highest hint tier available today (orient + method). */
export const MAX_HINT_TIER = 2;

export interface Hint {
  /** The box the kid should work on next — for highlighting/orienting. */
  frontierBoxId: string;
  /** i18n key for the hint message at this tier. */
  messageKey: string;
}

/** The hint to show for `question` at `tier`, given the kid's current ink. */
export function nextHint(
  question: Question,
  layout: ProblemLayout,
  answerInk: AnswerInk,
  tier: number,
): Hint {
  const shape = answerShape(question);
  const frontierBoxId = frontierBox(answerInk, shape, layout);
  const op = question.operation;

  // Tier 1 — orient.
  if (tier <= 1) {
    return { frontierBoxId, messageKey: `hints.orient.${op}` };
  }

  // Tier 2 — method. Subtraction is borrow-aware: if the column the kid is on
  // needs a borrow, say so; otherwise give the plain subtraction nudge.
  if (op === 'subtraction') {
    const needsBorrow = computeSolvePlan(question, layout).borrowBefore.has(
      frontierBoxId,
    );
    return {
      frontierBoxId,
      messageKey: needsBorrow
        ? 'hints.method.subtractionBorrow'
        : 'hints.method.subtraction',
    };
  }
  return { frontierBoxId, messageKey: `hints.method.${op}` };
}

/** One step the kid can be unblocked with: the correct digit for their next box. */
export interface HintStep {
  boxId: string;
  digit: number;
}

/**
 * The single next answer digit to reveal (top hint tier) — the correct value
 * for the kid's current frontier box. Null when there's nothing to fill (every
 * answer box already done, or the frontier has no value).
 */
export function nextStep(
  question: Question,
  layout: ProblemLayout,
  answerInk: AnswerInk,
): HintStep | null {
  const shape = answerShape(question);
  const boxId = frontierBox(answerInk, shape, layout);
  const digit = computeSolvePlan(question, layout).values.get(boxId);
  if (typeof digit !== 'number') return null;
  return { boxId, digit };
}
