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
 * Default gap between focusing a box and writing its digit. When the demo hand
 * cursor is on, the workspace raises this (see its `writeLeadMs`) so the hand
 * reaches the box before the ink appears; at 0 (no cursor) focus and write fire
 * together as before. Must stay below `SOLVE_STEP_MS`.
 */
export const SOLVE_WRITE_LEAD_MS = 0;
/**
 * How long the demo hand takes to glide between spots. Must match the
 * HandCursor's own `MOVE_MS`; used here to give a borrow-preceded write the
 * extra time the hand needs to travel down to the pad before it writes.
 */
const HAND_MOVE_MS = 650;
/**
 * Brief pause before the first action so the demo hand can appear parked at the
 * pad (its home) and the pad has reported its position, rather than jumping
 * straight to the first borrow/digit.
 */
const HOME_DWELL_MS = 600;
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
  /**
   * Fires at the start of each digit step (when focus lands on the box, before
   * the digit is written). Drives the demo hand's per-digit writing trace.
   */
  onFocusBox?: (boxId: string, digit: number) => void;
  /** For each subtraction borrow, fire one toggle. */
  onToggleBorrow?: (column: number) => void;
  /**
   * Fires `HAND_MOVE_MS` before a borrow is toggled, so the demo hand can glide
   * up to the lender digit and be there when the borrow animation starts.
   */
  onBorrowApproach?: (column: number) => void;
  /** Toggle a long-division step's borrow on the given minuend-digit lender. */
  onDivisionBorrow?: (step: number, lender: number) => void;
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
  /** Fires once the last digit is written and the pad has closed. */
  onComplete?: () => void;
  /**
   * Delay between focusing a box and writing its digit, in ms. Lets the demo
   * hand finish writing before the ink appears. Defaults to 0 (focus + write
   * together). Capped below the step length.
   */
  writeLeadMs?: number;
  /**
   * Time per digit step, in ms. Defaults to `SOLVE_STEP_MS`; the demo raises it
   * so each traced digit has room to play out plus a beat to read the result.
   */
  stepMs?: number;
}

export interface UseSolverResult {
  solve: () => void;
  /**
   * Animate just one cell (a hint's "next step"): its borrow + the digit, then
   * focus `focusAfter` (the next empty box) so the kid can carry on writing.
   */
  solveStep: (id: string, value: number, focusAfter?: string | null) => void;
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
    onFocusBox,
    onToggleBorrow,
    onBorrowApproach,
    onDivisionBorrow,
    setBringDownPulse,
    onSolved,
    onComplete,
    writeLeadMs = SOLVE_WRITE_LEAD_MS,
    stepMs = SOLVE_STEP_MS,
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

    let delay = HOME_DWELL_MS;
    const schedule = (fn: () => void, ms: number) => {
      const handle = setTimeout(fn, ms);
      timersRef.current.push(handle);
    };

    // Each step: borrow first for the columns this box needs (reach the column
    // → borrow if needed → write it), then focus the box and start the hand
    // writing, then write the digit a beat later so the ink lands as the hand
    // finishes.
    const lead = Math.min(writeLeadMs, stepMs - 1);
    const firedDivSteps = new Set<number>();
    orderedWrites.forEach(({ id, value }) => {
      // Long division: before a step's first difference cell, tap that step's
      // subtraction borrows so the kid sees the borrow, not just the result.
      const ddMatch = /^dd-(\d+)-\d+$/.exec(id);
      if (ddMatch) {
        const row = Number(ddMatch[1]);
        const step = (row - 1) / 2;
        if (row % 2 === 1 && !firedDivSteps.has(step)) {
          firedDivSteps.add(step);
          (plan.divisionBorrows.get(step) ?? []).forEach((lender) => {
            schedule(() => onDivisionBorrow?.(step, lender), delay);
            delay += SOLVE_BORROW_MS;
          });
        }
      }
      const preBorrows = plan.borrowBefore.get(id);
      if (preBorrows) {
        preBorrows.forEach((column) => {
          // Glide the hand up to the lender first, then trigger the borrow
          // (cross-out + arrow) once it has arrived.
          schedule(() => onBorrowApproach?.(column), delay);
          schedule(() => onToggleBorrow?.(column), delay + HAND_MOVE_MS);
          delay += HAND_MOVE_MS + SOLVE_BORROW_MS;
        });
      }
      // After a borrow tap the hand is up at the lender digit and glides back
      // down to the pad, so give the ink (and the next step) that travel time.
      const move = preBorrows ? HAND_MOVE_MS : 0;
      const focusAt = delay;
      const isBringDown = plan.bringDownCells.has(id);
      schedule(() => {
        setActiveBox(id);
        onFocusBox?.(id, value);
      }, focusAt);
      schedule(() => {
        writeBox(id, value);
        if (isBringDown) {
          setBringDownPulse((prev) => ({
            cellId: id,
            nonce: (prev?.cellId === id ? prev.nonce : 0) + 1,
          }));
        }
      }, focusAt + lead + move);
      delay += stepMs + move;
    });

    // Close the writing pad at the end so the kid sees the final answer.
    schedule(() => setActiveBox(null), delay);
    if (onComplete) {
      delay += stepMs;
      schedule(onComplete, delay);
    }
  }, [
    cancelAdvance,
    cancelSolve,
    expectedCarries,
    isDivision,
    isLongDivision,
    layout,
    multInfo,
    onBorrowApproach,
    onComplete,
    onDivisionBorrow,
    onFocusBox,
    onSolved,
    onToggleBorrow,
    question,
    setActiveBox,
    setBringDownPulse,
    shape,
    stepMs,
    writeBox,
    writeLeadMs,
  ]);

  // Animate a single cell for the Hint helper: its subtraction borrow (if
  // any), then the hand writing the digit. Division-step borrows are skipped
  // here (toggling them per-cell would double-fire); the digit still reveals.
  const solveStep = useCallback(
    (id: string, value: number, focusAfter: string | null = null) => {
      cancelAdvance();
      cancelSolve();
      const plan = computeSolvePlan(question, layout);
      let delay = HOME_DWELL_MS;
      const schedule = (fn: () => void, ms: number) => {
        const handle = setTimeout(fn, ms);
        timersRef.current.push(handle);
      };

      const preBorrows = plan.borrowBefore.get(id);
      if (preBorrows) {
        preBorrows.forEach((column) => {
          schedule(() => onBorrowApproach?.(column), delay);
          schedule(() => onToggleBorrow?.(column), delay + HAND_MOVE_MS);
          delay += HAND_MOVE_MS + SOLVE_BORROW_MS;
        });
      }
      const move = preBorrows ? HAND_MOVE_MS : 0;
      const lead = Math.min(writeLeadMs, stepMs - 1);
      const focusAt = delay;
      const isBringDown = plan.bringDownCells.has(id);
      schedule(() => {
        setActiveBox(id);
        onFocusBox?.(id, value);
      }, focusAt);
      schedule(() => {
        writeBox(id, value);
        if (isBringDown) {
          setBringDownPulse((prev) => ({
            cellId: id,
            nonce: (prev?.cellId === id ? prev.nonce : 0) + 1,
          }));
        }
      }, focusAt + lead + move);
      // Advance focus to the next empty box (or close the pad if none) so the
      // kid can keep writing right where they left off.
      schedule(() => setActiveBox(focusAfter), focusAt + lead + move + stepMs);
      if (onComplete) schedule(onComplete, focusAt + lead + move + stepMs);
    },
    [
      cancelAdvance,
      cancelSolve,
      layout,
      onBorrowApproach,
      onComplete,
      onFocusBox,
      onToggleBorrow,
      question,
      setActiveBox,
      setBringDownPulse,
      stepMs,
      writeBox,
      writeLeadMs,
    ],
  );

  return { solve, solveStep, cancelSolve };
}
