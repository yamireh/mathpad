/**
 * useSolver — the auto-solve animation for the practice workspace.
 *
 * Drives the same fill order the kid would auto-advance through:
 * fires any subtraction borrows first (one at a time, sized so each
 * borrow-arrow animation completes), then walks the box sequence
 * writing each digit's ink via `writeBox`. For long-division
 * bring-downs, also bumps `setBringDownPulse` so the draft grid runs
 * its drop-in animation. Closes the writing pad at the end so the
 * kid sees the final answer.
 *
 * Owns its own timer list and clears it on:
 *  - manual cancel
 *  - the question changing
 *  - unmount
 */
import { useCallback, useEffect, useRef } from 'react';

import { computeSolvePlan } from '../../../lib/solver/solveValues';
import {
  type AnswerShape,
  digitCount,
  longDivisionDivisorCarries,
} from '../layout';
import type { ProblemLayout, Question } from '../../../types';
import { fillSequence, type MultiplicationInfo } from './';

/** Idle delay between writing one digit and starting the next. */
export const SOLVE_STEP_MS = 1000;
/**
 * Gap between subtraction borrow taps during the auto-solve. Sized to
 * cover the full BorrowArrow animation (~280 fade-in + 1500 trace +
 * 260 label fade-in + 1800 hold + 420 fade-out ≈ 4.26s) plus a small
 * breath, so each borrow plays its arrow to completion before the next
 * one fires — exactly like a kid solving step by step.
 */
export const SOLVE_BORROW_MS = 4500;

export interface UseSolverArgs {
  question: Question;
  layout: ProblemLayout;
  shape: AnswerShape;
  expectedCarries: boolean[] | null;
  multInfo: MultiplicationInfo | null;
  isDivision: boolean;
  isLongDivision: boolean;
  /** Cancel any pending auto-advance before kicking off the solver. */
  cancelAdvance: () => void;
  /** Write the given digit's ink into the box. */
  writeBox: (boxId: string, digit: number) => void;
  /** Focus a box (drives the pad to land on it). */
  setActiveBox: (id: string | null) => void;
  /** For each subtraction borrow, fire one toggle. */
  onToggleBorrow?: (column: number) => void;
  /** Bump a per-cell nonce to trigger the long-division drop animation. */
  setBringDownPulse: (
    next: (
      prev: { cellId: string; nonce: number } | null,
    ) => { cellId: string; nonce: number } | null,
  ) => void;
  /**
   * Fires the moment Solve is invoked, so the session can flag the question
   * as Auto-Solved. Called synchronously before any digits are written so
   * cancelling the animation can't dodge the mark.
   */
  onSolved?: () => void;
}

export interface UseSolverResult {
  solve: () => void;
  cancelSolve: () => void;
}

export function useSolver(args: UseSolverArgs): UseSolverResult {
  const {
    question,
    layout,
    shape,
    expectedCarries,
    multInfo,
    isDivision,
    isLongDivision,
    cancelAdvance,
    writeBox,
    setActiveBox,
    onToggleBorrow,
    setBringDownPulse,
    onSolved,
  } = args;

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const cancelSolve = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Cancel on unmount + whenever the question itself changes.
  useEffect(() => cancelSolve, [cancelSolve]);
  useEffect(() => {
    cancelSolve();
  }, [question.id, cancelSolve]);

  const solve = useCallback(() => {
    cancelAdvance();
    cancelSolve();
    // Mark this question as Auto-Solved before animating so a mid-animation
    // cancel can't dodge the Fixed badge on the Results screen.
    onSolved?.();
    const plan = computeSolvePlan(question, layout);
    const draftSize =
      isDivision && isLongDivision
        ? {
            columns: digitCount(question.operands[0]),
            rows: 2 * (shape.integerBoxes + shape.decimalBoxes),
            divisorDigits: digitCount(question.operands[1]),
            divisorCarryCols: longDivisionDivisorCarries(question),
          }
        : null;
    const seq = fillSequence(shape, layout, expectedCarries, multInfo, draftSize);
    const orderedWrites = seq
      .map((id) => ({ id, value: plan.values.get(id) }))
      .filter((step): step is { id: string; value: number } =>
        typeof step.value === 'number',
      );

    let delay = 0;
    const schedule = (fn: () => void, ms: number) => {
      const handle = setTimeout(fn, ms);
      timersRef.current.push(handle);
    };

    plan.borrows.forEach((column) => {
      const at = delay;
      schedule(() => onToggleBorrow?.(column), at);
      delay += SOLVE_BORROW_MS;
    });

    orderedWrites.forEach(({ id, value }) => {
      const at = delay;
      const isBringDown = plan.bringDownCells.has(id);
      schedule(() => {
        setActiveBox(id);
        writeBox(id, value);
        if (isBringDown) {
          setBringDownPulse((prev) => ({
            cellId: id,
            nonce: (prev?.cellId === id ? prev.nonce : 0) + 1,
          }));
        }
      }, at);
      delay += SOLVE_STEP_MS;
    });

    // Close the writing pad at the end so the kid sees the final answer.
    schedule(() => setActiveBox(null), delay);
  }, [
    cancelAdvance,
    cancelSolve,
    expectedCarries,
    isDivision,
    isLongDivision,
    layout,
    multInfo,
    onSolved,
    onToggleBorrow,
    question,
    setActiveBox,
    setBringDownPulse,
    shape,
    writeBox,
  ]);

  return { solve, cancelSolve };
}
