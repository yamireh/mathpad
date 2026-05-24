import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { digitInk } from '../../lib/solver/digitInk';
import { computeSolvePlan } from '../../lib/solver/solveValues';

import { Button, Chip, IconButton, TipBubble } from '../ui';
import { colors, spacing, typography } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
import { AnswerArea } from './AnswerArea';
import { AnswerPad } from './AnswerPad';
import { DivisionDraftGrid } from './DivisionDraftGrid';
import { ProblemDisplay } from './ProblemDisplay';
import {
  ScratchCanvas,
  type ScratchCanvasHandle,
  type ScratchTool,
} from './ScratchCanvas';
import {
  type AnswerInk,
  emptyAnswerInk,
  frontierBox,
  getBoxStrokes,
  type InkStroke,
  isBoxWritable,
  setBoxStrokes,
} from './ink';
import {
  type AnswerShape,
  type ProblemSizing,
  answerShape,
  compactSizing,
  digitCount,
  divisionDraftRowLayout,
  divisionDraftSize,
  divisionSizing,
  DIVISION_DRAFT_CELL_WIDTH,
  DIVISION_MINUS_WIDTH,
  DIVISION_QUOTIENT_HEIGHT,
  partialMultiplicationCarries,
  partialWidths,
} from './layout';

/** Multi-digit × info threaded through fill-sequence + sizing logic. */
interface MultiplicationInfo {
  op1: number;
  op2: number;
  op1Cols: number;
  partials: number[];
}

/** Parse a partial-product box id (`pp-{row}-{col}`) or return null. */
function parsePartialId(id: string): { row: number; col: number } | null {
  const m = /^pp-(\d+)-(\d+)$/.exec(id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}

/** Parse a times-carry box id (`tcarry-{row}-{op1Col}`) or return null. */
function parseTimesCarryId(
  id: string,
): { row: number; col: number } | null {
  const m = /^tcarry-(\d+)-(\d+)$/.exec(id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}

/** Parse a division-draft box id (`dd-{row}-{col}`) or return null. */
function parseDivisionDraftId(
  id: string,
): { row: number; col: number } | null {
  const m = /^dd-(\d+)-(\d+)$/.exec(id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}

/** Highest row index in the division-draft ink that has any strokes, or -1. */
function lastDraftInkRow(ink: InkStroke[][][] | undefined): number {
  if (!ink) return -1;
  for (let r = ink.length - 1; r >= 0; r -= 1) {
    if (ink[r]?.some((cell) => cell.length > 0)) return r;
  }
  return -1;
}

/** Idle time after the last stroke before auto-advancing to the next box. */
const ADVANCE_DELAY_MS = 300;

/**
 * Build the auto-advance sequence. For a vertical +/× problem, each sum
 * answer box is followed by the carry box above the column to its left
 * when the math actually generates a carry. For multi-digit multiplication,
 * the kid walks each partial product first (units → leftmost), with the
 * per-step times-carry `tcarry-{row}-{op1Col}` slot interleaved between
 * partial cells whenever that step generates a carry into op1's next
 * column. The final-sum walk follows the addition pattern.
 */
function fillSequence(
  shape: AnswerShape,
  layout: ProblemLayout,
  expectedCarries: boolean[] | null,
  mult: MultiplicationInfo | null,
  divisionDraft: {
    rows: number;
    columns: number;
    divisorDigits: number;
  } | null,
): string[] {
  if (layout !== 'vertical' || !expectedCarries) {
    const order: string[] = [];
    const isDivision =
      layout === 'divisionLong' ||
      layout === 'divisionHorizontal' ||
      layout === 'divisionDecimal';
    if (isDivision && divisionDraft && divisionDraft.rows > 0) {
      // Long division walk: write each quotient digit (integer OR decimal),
      // then the product + difference rows for that step, then move on.
      //
      // The draft grid follows the standard paper layout: each pair of
      // rows (product + difference) is shifted one column right from the
      // previous pair, and the difference row is one cell wider than the
      // product to hold the brought-down digit. Within a row, walk from
      // the dividend-aligned rightmost cell down to the row's leftmost
      // cell — units first, the way kids write column arithmetic.
      const offset = Math.max(0, divisionDraft.columns - shape.integerBoxes);
      const totalSteps = shape.integerBoxes + shape.decimalBoxes;
      for (let q = 0; q < totalSteps; q += 1) {
        const isDecimalStep = q >= shape.integerBoxes;
        const quotientId = isDecimalStep
          ? `dec-${q - shape.integerBoxes}`
          : `int-${q}`;
        order.push(quotientId);
        const prodRow = 2 * q;
        const diffRow = 2 * q + 1;
        // Where this step's working column ends. For integer steps that's
        // the dividend column under quotient digit q; for decimal expansion
        // steps it continues past the dividend into extension cells.
        const rightCol = q + offset;
        const pushRow = (row: number, brought: boolean) => {
          if (row >= divisionDraft.rows) return;
          const { startCol, cellCount } = divisionDraftRowLayout(
            row,
            divisionDraft.columns,
            {
              divisorDigits: divisionDraft.divisorDigits,
              integerQuotientDigits: shape.integerBoxes,
            },
          );
          const lastCol = startCol + cellCount - 1;
          // Difference row also includes the brought-down digit cell, one
          // column to the right of the product row's rightmost.
          const maxCol = Math.min(lastCol, rightCol + (brought ? 1 : 0));
          for (let c = maxCol; c >= startCol; c -= 1) {
            order.push(`dd-${row}-${c}`);
          }
        };
        pushRow(prodRow, false);
        pushRow(diffRow, true);
      }
      // Remainder boxes (if any) come at the very end — they're the final
      // difference transcribed into the answer area.
      for (let i = 0; i < shape.remainderBoxes; i += 1) order.push(`rem-${i}`);
      return order;
    }
    if (isDivision) {
      for (let i = 0; i < shape.integerBoxes; i += 1) order.push(`int-${i}`);
    } else {
      // Vertical layout with no expected carries (subtraction) — right-to-left.
      for (let i = shape.integerBoxes - 1; i >= 0; i -= 1) order.push(`int-${i}`);
    }
    for (let i = 0; i < shape.decimalBoxes; i += 1) order.push(`dec-${i}`);
    for (let i = 0; i < shape.remainderBoxes; i += 1) order.push(`rem-${i}`);
    return order;
  }
  const seq: string[] = [];
  if (mult) {
    const { op1, op2, op1Cols, partials } = mult;
    let op2Remaining = Math.abs(op2);
    for (let r = 0; r < partials.length; r += 1) {
      const width = partials[r];
      const d = op2Remaining % 10;
      op2Remaining = Math.floor(op2Remaining / 10);
      const carries = partialMultiplicationCarries(op1, d, op1Cols);
      // Walk op1 from units (rightmost) to leftmost. Each step writes one
      // partial cell; if the step generates a carry into op1's next col,
      // visit that tcarry slot before the next partial cell.
      for (let pos = 0; pos < op1Cols; pos += 1) {
        seq.push(`pp-${r}-${width - 1 - pos}`);
        if (pos < op1Cols - 1 && carries[pos]) {
          seq.push(`tcarry-${r}-${op1Cols - 2 - pos}`);
        }
      }
      // Overflow into the partial's leftmost cell when w > op1Cols.
      if (width > op1Cols) seq.push(`pp-${r}-0`);
    }
  }
  for (let r = 0; r < shape.integerBoxes; r += 1) {
    const intCol = shape.integerBoxes - 1 - r;
    seq.push(`int-${intCol}`);
    const carryCol = intCol - 1;
    if (carryCol >= 0 && expectedCarries[carryCol]) {
      seq.push(`carry-${carryCol}`);
    }
  }
  for (let i = 0; i < shape.decimalBoxes; i += 1) seq.push(`dec-${i}`);
  for (let i = 0; i < shape.remainderBoxes; i += 1) seq.push(`rem-${i}`);
  return seq;
}

/**
 * For an N-operand column addition over `columns` digit columns, return a
 * per-column flag (indexed left-to-right) marking columns that *receive* a
 * carry from the column to their right. Used by both addition (`op1 + op2`)
 * and the multiplication sum step (adding the partial products together) so
 * the auto-advance skips carry slots the math says aren't needed.
 */
function multiOperandCarries(
  operands: number[],
  columns: number,
): boolean[] {
  const out = new Array<boolean>(columns).fill(false);
  const remaining = operands.map((o) => Math.abs(o));
  let carry = 0;
  for (let pos = 0; pos < columns; pos += 1) {
    let sum = carry;
    for (let i = 0; i < remaining.length; i += 1) {
      sum += remaining[i] % 10;
      remaining[i] = Math.floor(remaining[i] / 10);
    }
    const nextCarry = Math.floor(sum / 10);
    if (nextCarry > 0) {
      const receiverFromLeft = columns - 2 - pos;
      if (receiverFromLeft >= 0) out[receiverFromLeft] = true;
    }
    carry = nextCarry;
  }
  return out;
}

/** Partial-product values for `op1 × op2`, shifted into their place values. */
function partialProductValues(op1: number, op2: number): number[] {
  const values: number[] = [];
  let m = Math.abs(op2);
  let shift = 1;
  while (m > 0) {
    values.push(Math.abs(op1) * (m % 10) * shift);
    m = Math.floor(m / 10);
    shift *= 10;
  }
  return values;
}

/** First empty box in `seq` strictly after `currentId`; null if none. */
function nextEmptyBox(
  seq: string[],
  currentId: string,
  ink: AnswerInk,
  carryInk: InkStroke[][] | undefined,
  partialInk: InkStroke[][][] | undefined,
  timesCarryInk: InkStroke[][][] | undefined,
  divisionDraftInk: InkStroke[][][] | undefined,
): string | null {
  const startIdx = seq.indexOf(currentId);
  for (let i = startIdx + 1; i < seq.length; i += 1) {
    const id = seq[i];
    if (id.startsWith('carry-')) {
      const col = Number(id.slice(6));
      if ((carryInk?.[col]?.length ?? 0) === 0) return id;
      continue;
    }
    const tc = parseTimesCarryId(id);
    if (tc) {
      if ((timesCarryInk?.[tc.row]?.[tc.col]?.length ?? 0) === 0) return id;
      continue;
    }
    const pp = parsePartialId(id);
    if (pp) {
      if ((partialInk?.[pp.row]?.[pp.col]?.length ?? 0) === 0) return id;
      continue;
    }
    const dd = parseDivisionDraftId(id);
    if (dd) {
      if ((divisionDraftInk?.[dd.row]?.[dd.col]?.length ?? 0) === 0) return id;
      continue;
    }
    if (getBoxStrokes(ink, id).length === 0) return id;
  }
  return null;
}

export interface QuestionWorkspaceProps {
  question: Question;
  /** Effective problem layout (after any user override). */
  layout: ProblemLayout;
  /** When set, division questions show a long ⇄ in-a-row layout toggle. */
  onLayoutChange?: (layout: ProblemLayout) => void;
  answerInk: AnswerInk;
  onAnswerInkChange: (ink: AnswerInk) => void;
  scratchInk?: InkStroke[];
  onScratchInkChange: (strokes: InkStroke[]) => void;
  /** Tapped borrow-lender columns for subtraction. */
  borrowMarks?: number[];
  /** Toggle a borrow on a top-operand digit (subtraction only). */
  onToggleBorrow?: (column: number) => void;
  /** Per-column carry ink (addition / multiplication). */
  carryInk?: InkStroke[][];
  /** Reports a carry box's strokes (addition / multiplication only). */
  onCarryInkChange?: (column: number, strokes: InkStroke[]) => void;
  /** Per-row, per-column partial-product ink (multi-digit × only). */
  partialInk?: InkStroke[][][];
  /** Reports a partial-product cell's strokes (multi-digit × only). */
  onPartialInkChange?: (
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  /** Per-partial times-step carry ink (multi-digit × only). */
  timesCarryInk?: InkStroke[][][];
  /** Reports a per-partial times-carry cell's strokes (multi-digit × only). */
  onTimesCarryInkChange?: (
    partialRow: number,
    op1Col: number,
    strokes: InkStroke[],
  ) => void;
  /** Long-division draft-grid ink keyed by [row][col]. */
  divisionDraftInk?: InkStroke[][][];
  /** Reports one division draft cell's strokes. */
  onDivisionDraftInkChange?: (
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  tone: string;
}

/** Imperative methods exposed by `QuestionWorkspace` via `ref`. */
export interface QuestionWorkspaceHandle {
  /**
   * Auto-solve the current question, animating digit-by-digit using the
   * same fill sequence the kid would follow. Used for manual QA and as a
   * foundation for e2e flows; pacing is set to "watchable but quick".
   */
  solve: () => void;
}

/** Idle delay between writing one digit and starting the next. */
const SOLVE_STEP_MS = 750;
/** Gap between subtraction borrow taps. */
const SOLVE_BORROW_MS = 750;

/**
 * The shared "solve a question" surface used by Practice and Review.
 *
 * Division uses wide write-directly answer strips and a working area; every
 * other operation uses small column-aligned answer boxes plus a pop-up pad.
 */
export const QuestionWorkspace = forwardRef<
  QuestionWorkspaceHandle,
  QuestionWorkspaceProps
>(function QuestionWorkspace(
  {
    question,
    layout,
    onLayoutChange,
    answerInk,
    onAnswerInkChange,
    scratchInk,
    onScratchInkChange,
    borrowMarks,
    onToggleBorrow,
    carryInk,
    onCarryInkChange,
    partialInk,
    onPartialInkChange,
    timesCarryInk,
    onTimesCarryInkChange,
    divisionDraftInk,
    onDivisionDraftInkChange,
    tone,
  }: QuestionWorkspaceProps,
  ref,
) {
  const { t } = useTranslation();
  const shape = answerShape(question);
  // Multi-digit × starts on the units cell of partial 0 (where the kid
  // actually begins the long-multiplication walk) instead of the sum row.
  const [activeBox, setActiveBox] = useState<string | null>(() => {
    if (question.operation === 'multiplication') {
      const widths = partialWidths(
        question.operands[0],
        question.operands[1],
      );
      if (widths && widths.length > 0) return `pp-0-${widths[0] - 1}`;
    }
    return frontierBox(answerInk, shape, layout);
  });
  const [tool, setTool] = useState<ScratchTool>('pen');
  const [padNonce, setPadNonce] = useState(0);
  const scratchRef = useRef<ScratchCanvasHandle>(null);

  const isLongDivision = layout === 'divisionLong';
  const isDivision = question.operation === 'division';
  const inlineLayout: ProblemLayout =
    question.answer.kind === 'decimal'
      ? 'divisionDecimal'
      : 'divisionHorizontal';

  // Carry boxes write through the same pad; -1 when an answer box is active.
  const activeCarryColumn =
    activeBox && activeBox.startsWith('carry-')
      ? Number(activeBox.slice(6))
      : -1;
  const activePartial = activeBox ? parsePartialId(activeBox) : null;
  const activeTimesCarry = activeBox ? parseTimesCarryId(activeBox) : null;
  const activeDivisionDraft = activeBox
    ? parseDivisionDraftId(activeBox)
    : null;

  // Which partial-row the top times-carry slot is bound to. Updates whenever
  // the kid focuses a partial cell OR a tcarry whose own row identifies the
  // partial; stays put for sum / scratch focus so the carry row keeps its
  // meaning while the kid hops around.
  const [currentPartialRow, setCurrentPartialRow] = useState(0);
  useEffect(() => {
    if (activePartial) setCurrentPartialRow(activePartial.row);
    else if (activeTimesCarry) setCurrentPartialRow(activeTimesCarry.row);
  }, [activePartial, activeTimesCarry]);

  // Per-column "this column gets a carry" flags for the SUM row. Drives the
  // auto-advance. Addition and multiplication both reduce to summing N
  // operands column-by-column; subtraction / division get null.
  const expectedCarries = useMemo<boolean[] | null>(() => {
    if (question.operation === 'addition') {
      return multiOperandCarries(
        [question.operands[0], question.operands[1]],
        shape.integerBoxes,
      );
    }
    if (question.operation === 'multiplication') {
      return multiOperandCarries(
        partialProductValues(question.operands[0], question.operands[1]),
        shape.integerBoxes,
      );
    }
    return null;
  }, [question.operation, question.operands, shape.integerBoxes]);

  // For multi-digit ×, bundle of facts the fill-sequence + sizing need.
  // Null for any operation that doesn't render partial-product rows.
  const multInfo = useMemo<MultiplicationInfo | null>(() => {
    if (question.operation !== 'multiplication') return null;
    const [op1, op2] = question.operands;
    const partials = partialWidths(op1, op2);
    if (!partials) return null;
    return { op1, op2, op1Cols: digitCount(op1), partials };
  }, [question.operation, question.operands]);
  const partialShape = multInfo?.partials ?? null;

  // Window-width-driven sizing — shared by both the regular vertical path
  // (computed below) and the long-division path (which falls inside the
  // `isDivision` early return, so we hoist the call here).
  const { width: windowWidth } = useWindowDimensions();

  // Auto-advance: when the kid finishes a digit, jump to the next writable
  // box so they can keep writing without tapping. Triggered ADVANCE_DELAY_MS
  // after the last stroke ends; a new stroke cancels the pending jump so
  // multi-stroke digits (4, 5, 7…) stay on the same box. For addition /
  // multiplication, the sequence interleaves carry boxes between answer
  // columns so the kid is offered the carry slot right after each digit.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStrokeCountRef = useRef<number>(0);
  const latestInkRef = useRef(answerInk);
  latestInkRef.current = answerInk;
  const latestCarryInkRef = useRef(carryInk);
  latestCarryInkRef.current = carryInk;
  const latestPartialInkRef = useRef(partialInk);
  latestPartialInkRef.current = partialInk;
  const latestTimesCarryRef = useRef(timesCarryInk);
  latestTimesCarryRef.current = timesCarryInk;
  const latestDivisionDraftRef = useRef(divisionDraftInk);
  latestDivisionDraftRef.current = divisionDraftInk;

  const cancelAdvance = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelAdvance, [cancelAdvance]);

  // Sequential fill: tapping a still-locked box snaps to the next box to fill.
  // Carry / partial / times-carry / division-draft boxes are always writable
  // (they're working-out, not the recognised answer).
  const selectBox = (boxId: string) => {
    cancelAdvance();
    if (
      boxId.startsWith('carry-') ||
      boxId.startsWith('pp-') ||
      boxId.startsWith('tcarry-') ||
      boxId.startsWith('dd-')
    ) {
      setActiveBox(boxId);
      return;
    }
    setActiveBox(
      isBoxWritable(answerInk, shape, layout, boxId)
        ? boxId
        : frontierBox(answerInk, shape, layout),
    );
  };

  // Clear every answer box and return focus to the first box.
  const clearAllAnswers = () => {
    cancelAdvance();
    const empty = emptyAnswerInk(shape);
    onAnswerInkChange(empty);
    setActiveBox(frontierBox(empty, shape, layout));
    setPadNonce((n) => n + 1);
  };

  // Clear one box (answer, carry, partial, or times-carry). Re-focuses the
  // cleared box and remounts the pad with empty strokes so the kid can
  // rewrite the digit right away without re-tapping or seeing old ink.
  const clearBox = (boxId: string) => {
    cancelAdvance();
    if (boxId.startsWith('carry-')) {
      onCarryInkChange?.(Number(boxId.slice(6)), []);
    } else {
      const pp = parsePartialId(boxId);
      const tc = parseTimesCarryId(boxId);
      const dd = parseDivisionDraftId(boxId);
      if (pp) {
        onPartialInkChange?.(pp.row, pp.col, []);
      } else if (tc) {
        onTimesCarryInkChange?.(tc.row, tc.col, []);
      } else if (dd) {
        onDivisionDraftInkChange?.(dd.row, dd.col, []);
      } else {
        onAnswerInkChange(setBoxStrokes(answerInk, boxId, []));
      }
    }
    lastStrokeCountRef.current = 0;
    setActiveBox(boxId);
    setPadNonce((n) => n + 1);
  };

  // Reset the stroke counter whenever the active box changes (manual select,
  // auto-advance, or pad close) so the next ink commit compares against the
  // right baseline.
  useEffect(() => {
    cancelAdvance();
    if (!activeBox) {
      lastStrokeCountRef.current = 0;
      return;
    }
    if (activeBox.startsWith('carry-')) {
      const col = Number(activeBox.slice(6));
      lastStrokeCountRef.current = carryInk?.[col]?.length ?? 0;
      return;
    }
    const pp = parsePartialId(activeBox);
    if (pp) {
      lastStrokeCountRef.current =
        partialInk?.[pp.row]?.[pp.col]?.length ?? 0;
      return;
    }
    const tc = parseTimesCarryId(activeBox);
    if (tc) {
      lastStrokeCountRef.current =
        timesCarryInk?.[tc.row]?.[tc.col]?.length ?? 0;
      return;
    }
    const dd = parseDivisionDraftId(activeBox);
    if (dd) {
      lastStrokeCountRef.current =
        divisionDraftInk?.[dd.row]?.[dd.col]?.length ?? 0;
      return;
    }
    lastStrokeCountRef.current = getBoxStrokes(
      latestInkRef.current,
      activeBox,
    ).length;
    // Ink snapshots intentionally read only when activeBox changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBox]);

  /* ---------------------------------------------------------------------- */
  /* Auto-solve (manual QA / future e2e harness)                              */
  /* ---------------------------------------------------------------------- */
  // Pending solve timers — cleared on cancel, on a new solve, and on unmount.
  const solveTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const cancelSolve = useCallback(() => {
    solveTimersRef.current.forEach(clearTimeout);
    solveTimersRef.current = [];
  }, []);

  useEffect(() => cancelSolve, [cancelSolve]);

  // Cancel any in-flight solve when the question itself changes.
  useEffect(() => {
    cancelSolve();
  }, [question.id, cancelSolve]);

  const writeBox = useCallback(
    (boxId: string, digit: number) => {
      const strokes = digitInk(digit);
      if (boxId.startsWith('carry-')) {
        onCarryInkChange?.(Number(boxId.slice(6)), strokes);
        return;
      }
      const pp = parsePartialId(boxId);
      if (pp) {
        onPartialInkChange?.(pp.row, pp.col, strokes);
        return;
      }
      const tc = parseTimesCarryId(boxId);
      if (tc) {
        onTimesCarryInkChange?.(tc.row, tc.col, strokes);
        return;
      }
      const dd = parseDivisionDraftId(boxId);
      if (dd) {
        onDivisionDraftInkChange?.(dd.row, dd.col, strokes);
        return;
      }
      onAnswerInkChange(setBoxStrokes(latestInkRef.current, boxId, strokes));
    },
    [
      onAnswerInkChange,
      onCarryInkChange,
      onDivisionDraftInkChange,
      onPartialInkChange,
      onTimesCarryInkChange,
    ],
  );

  const solve = useCallback(() => {
    cancelAdvance();
    cancelSolve();
    const plan = computeSolvePlan(question, layout);
    // Use the same fill order the kid would auto-advance through. Boxes
    // that have a value in the plan get written; others are skipped
    // (e.g. carry boxes for columns that don't actually carry).
    // For long division, generate enough rows for the full work — one
    // product + one difference row per quotient digit (integer + decimal).
    const draftSize =
      isDivision && isLongDivision
        ? {
            columns: digitCount(question.operands[0]),
            rows: 2 * (shape.integerBoxes + shape.decimalBoxes),
            divisorDigits: digitCount(question.operands[1]),
          }
        : null;
    const seq = fillSequence(
      shape,
      layout,
      expectedCarries,
      multInfo,
      draftSize,
    );
    const orderedWrites = seq
      .map((id) => ({ id, value: plan.values.get(id) }))
      .filter((step): step is { id: string; value: number } =>
        typeof step.value === 'number',
      );

    let delay = 0;
    const schedule = (fn: () => void, ms: number) => {
      const handle = setTimeout(fn, ms);
      solveTimersRef.current.push(handle);
    };

    // Subtraction borrows fire first as a quick burst of taps.
    plan.borrows.forEach((column) => {
      const at = delay;
      schedule(() => onToggleBorrow?.(column), at);
      delay += SOLVE_BORROW_MS;
    });
    if (plan.borrows.length > 0) delay += SOLVE_STEP_MS - SOLVE_BORROW_MS;

    orderedWrites.forEach(({ id, value }) => {
      const at = delay;
      schedule(() => {
        setActiveBox(id);
        writeBox(id, value);
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
    onToggleBorrow,
    question,
    shape,
    writeBox,
  ]);

  useImperativeHandle(ref, () => ({ solve }), [solve]);

  const scratch = (
    <ScratchCanvas
      ref={scratchRef}
      tool={tool}
      bordered={!isLongDivision}
      initialStrokes={scratchInk}
      onStrokesChange={onScratchInkChange}
      accessibilityLabel={t('a11y.scratchCanvas')}
    />
  );

  const toolbar = (
    <View style={styles.toolbar}>
      <Text style={styles.scratchLabel}>{t('practice.scratchHint')}</Text>
      <View style={styles.tools}>
        <Button
          label={t('practice.eraser')}
          variant={tool === 'eraser' ? 'primary' : 'secondary'}
          tone={tone}
          fullWidth={false}
          onPress={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
        />
        <IconButton
          name="arrow-undo-outline"
          accessibilityLabel={t('practice.undo')}
          onPress={() => scratchRef.current?.undo()}
        />
        <IconButton
          name="trash-outline"
          accessibilityLabel={t('practice.clearScratch')}
          onPress={() => scratchRef.current?.clear()}
        />
      </View>
    </View>
  );

  const layoutToggle =
    isDivision && onLayoutChange ? (
      <View style={styles.layoutToggle}>
        <Chip
          label={t('practice.layoutLong')}
          selected={isLongDivision}
          tone={tone}
          onPress={() => onLayoutChange('divisionLong')}
        />
        <Chip
          label={t('practice.layoutInline')}
          selected={!isLongDivision}
          tone={tone}
          onPress={() => onLayoutChange(inlineLayout)}
        />
      </View>
    ) : null;

  // Division: shared activeBox / pad routing with +/−/× now. The quotient
  // is rendered as AnswerBox cells (one per digit), left-aligned with the
  // dividend so the cells stay inside the bracket on narrow screens; the
  // long-division work area is a column-aligned grid of AnswerBox cells
  // (`dd-{row}-{col}`) that all feed the same shared writing pad.
  if (isDivision) {
    const draftSize = divisionDraftSize(question.operands[0]);
    // Visible draft rows grow as the kid fills toward the bottom: always
    // keep at least one empty row below the last row with ink so the
    // auto-advance has somewhere to land for the next step. Capped at
    // exactly `2 × totalQuotientDigits` — two rows per step (product +
    // difference). After the kid writes the final-step's diff (often 0),
    // no extra empty row appears below.
    const lastInkRow = lastDraftInkRow(divisionDraftInk);
    const maxRowsNeeded = 2 * (shape.integerBoxes + shape.decimalBoxes);
    const draftRows =
      draftSize.rows === 0
        ? 0
        : Math.min(maxRowsNeeded, Math.max(draftSize.rows, lastInkRow + 2));
    const draftGridSize = {
      columns: draftSize.columns,
      rows: draftRows,
      divisorDigits: digitCount(question.operands[1]),
    };

    // Dynamic cell width for the long-division grid: pick the largest cell
    // that lets the FULL staircase (dividend + last-step's extension cells)
    // fit on screen, falling back to compact's minimum (30pt) on the
    // narrowest devices. Prevents the kid from having to horizontal-scroll
    // away from the dividend in typical cases.
    const totalSteps = shape.integerBoxes + shape.decimalBoxes;
    const widestRowCells = Math.max(
      draftSize.columns,
      totalSteps + draftSize.columns,
    );
    // Chrome the bracket carries: outer ScrollView padding (lg × 2 = 32),
    // divisor text + its right padding (~50), bracket border (3),
    // bracket interior paddingLeft = spacing.md + DIVISION_MINUS_WIDTH,
    // plus a small right margin (8) so the grid doesn't kiss the edge.
    const chrome = 32 + 50 + 3 + 12 + DIVISION_MINUS_WIDTH + 8;
    const availableForCells = Math.max(180, windowWidth - chrome);
    const { cellWidth: dCellWidth, digitSize: dDigitSize } = divisionSizing(
      widestRowCells,
      availableForCells,
    );
    // Quotient sits at the leftmost dividend columns so the boxes don't
    // get pushed off the right edge of the bracket; the kid still sees one
    // quotient cell per digit and the visual flows naturally with the
    // draft work below.
    const answerArea = (
      <View>
        <AnswerArea
          question={question}
          ink={answerInk}
          onClearBox={clearBox}
          selectedBox={activeBox}
          onSelectBox={selectBox}
          tone={tone}
          isBoxWritable={(boxId) =>
            isBoxWritable(answerInk, shape, layout, boxId)
          }
          cellWidth={dCellWidth}
          boxHeight={DIVISION_QUOTIENT_HEIGHT}
        />
      </View>
    );
    const draftGrid =
      isLongDivision && onDivisionDraftInkChange && draftRows > 0 ? (
        <DivisionDraftGrid
          columns={draftSize.columns}
          rows={draftRows}
          ink={divisionDraftInk ?? []}
          selectedBox={activeBox}
          onSelect={selectBox}
          onClear={clearBox}
          tone={tone}
          cellWidth={dCellWidth}
          divisorDigits={digitCount(question.operands[1])}
          integerQuotientDigits={shape.integerBoxes}
        />
      ) : null;
    return (
      <View style={styles.container}>
        {layoutToggle}
        {isLongDivision ? (
          // The long-division area sits in a flex:1 frame. The dividend
          // row is pinned (rendered outside any ScrollView in
          // `LongDivisionProblem`); only the draft area below it scrolls
          // horizontally and vertically. No outer horizontal scroll here,
          // so the divisor + dividend never slide off the left edge.
          <View style={[styles.longArea, styles.longBody]}>
            <ProblemDisplay
              question={question}
              layout={layout}
              answerSlot={answerArea}
              workSlot={draftGrid}
              divisionCellWidth={dCellWidth}
              divisionDigitSize={dDigitSize}
              selectedBox={activeBox}
            />
          </View>
        ) : (
          <View style={styles.divisionInline}>
            <ProblemDisplay
              question={question}
              layout={layout}
              answerSlot={answerArea}
              divisionCellWidth={dCellWidth}
              divisionDigitSize={dDigitSize}
              selectedBox={activeBox}
            />
          </View>
        )}

        {/* For long division the kid's working area IS the draft staircase
            — no free-form scratch needed below. When the writing pad
            closes, leave the bottom empty so the bracket doesn't reflow
            and the bottom-bar buttons (Back / Next / Finish) stay
            visible in their normal spot. */}
        {activeBox ? (
          <View style={styles.bottomRegion}>
            <AnswerPad
              key={`${activeBox}:${padNonce}`}
              strokes={
                activeDivisionDraft
                  ? (divisionDraftInk?.[activeDivisionDraft.row]?.[
                      activeDivisionDraft.col
                    ] ?? [])
                  : getBoxStrokes(answerInk, activeBox)
              }
              onStrokeStart={cancelAdvance}
              onStrokesChange={(strokes) => {
                const prev = lastStrokeCountRef.current;
                lastStrokeCountRef.current = strokes.length;
                if (activeDivisionDraft) {
                  onDivisionDraftInkChange?.(
                    activeDivisionDraft.row,
                    activeDivisionDraft.col,
                    strokes,
                  );
                } else {
                  onAnswerInkChange(
                    setBoxStrokes(answerInk, activeBox, strokes),
                  );
                }
                if (strokes.length <= prev) {
                  cancelAdvance();
                  return;
                }
                cancelAdvance();
                advanceTimerRef.current = setTimeout(() => {
                  advanceTimerRef.current = null;
                  const seq = fillSequence(
                    shape,
                    layout,
                    expectedCarries,
                    multInfo,
                    draftRows > 0 ? draftGridSize : null,
                  );
                  const next = nextEmptyBox(
                    seq,
                    activeBox,
                    latestInkRef.current,
                    latestCarryInkRef.current,
                    latestPartialInkRef.current,
                    latestTimesCarryRef.current,
                    latestDivisionDraftRef.current,
                  );
                  setActiveBox(next);
                }, ADVANCE_DELAY_MS);
              }}
              onClearAll={clearAllAnswers}
              onDone={() => setActiveBox(null)}
              tone={tone}
            />
          </View>
        ) : isLongDivision ? null : (
          <View style={styles.bottomRegion}>{scratch}</View>
        )}

        {activeBox || isLongDivision ? null : toolbar}
      </View>
    );
  }

  // Unified sizing across +/−/×: every operation uses the same compact grid
  // that multi-digit × proved out well. Each mode can spread per-mode
  // overrides on top via `problemSizing(cols, width, overrides)` when it
  // needs to (e.g. taller carry boxes for addition). The base auto-shrinks
  // when N columns wouldn't otherwise fit the screen.
  const sizing: ProblemSizing = useMemo(() => {
    const [op1, op2] = question.operands;
    const columns = Math.max(
      digitCount(op1),
      digitCount(op2),
      shape.integerBoxes,
    );
    // 32pt = the ScrollView's horizontal padding (lg × 2). Conservative
    // floor in case the window value isn't yet populated.
    const available = Math.max(280, windowWidth - 32);
    return compactSizing(columns, available);
  }, [question.operands, shape.integerBoxes, windowWidth]);

  // +, −, ×: small answer boxes + pop-up writing pad.
  const answer = (
    <AnswerArea
      question={question}
      ink={answerInk}
      onClearBox={clearBox}
      selectedBox={activeBox}
      onSelectBox={selectBox}
      tone={tone}
      isBoxWritable={(boxId) =>
        isBoxWritable(answerInk, shape, layout, boxId)
      }
      cellWidth={sizing.cellWidth}
      boxHeight={sizing.boxHeight}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.problemArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.problemScroll}
        >
          <ProblemDisplay
            question={question}
            layout={layout}
            answerSlot={answer}
            borrowMarks={borrowMarks}
            onToggleBorrow={
              question.operation === 'subtraction'
                ? onToggleBorrow
                : undefined
            }
            carryInk={
              question.operation === 'addition' ||
              question.operation === 'multiplication'
                ? (carryInk ?? [])
                : undefined
            }
            partialInk={partialShape ? (partialInk ?? []) : undefined}
            timesCarryInk={
              partialShape
                ? (timesCarryInk?.[currentPartialRow] ?? [])
                : undefined
            }
            currentPartialRow={currentPartialRow}
            selectedBox={activeBox}
            onSelectBox={selectBox}
            onClearBox={clearBox}
            tone={tone}
            sizing={sizing}
          />
        </ScrollView>
      </View>

      {activeBox ? (
        <View style={styles.bottomRegion}>
          <AnswerPad
            key={`${activeBox}:${padNonce}`}
            strokes={
              activeCarryColumn >= 0
                ? (carryInk?.[activeCarryColumn] ?? [])
                : activePartial
                  ? (partialInk?.[activePartial.row]?.[activePartial.col] ?? [])
                  : activeTimesCarry
                    ? (timesCarryInk?.[activeTimesCarry.row]?.[
                        activeTimesCarry.col
                      ] ?? [])
                    : getBoxStrokes(answerInk, activeBox)
            }
            onStrokeStart={cancelAdvance}
            onStrokesChange={(strokes) => {
              const prev = lastStrokeCountRef.current;
              lastStrokeCountRef.current = strokes.length;
              if (activeCarryColumn >= 0) {
                onCarryInkChange?.(activeCarryColumn, strokes);
              } else if (activePartial) {
                onPartialInkChange?.(
                  activePartial.row,
                  activePartial.col,
                  strokes,
                );
              } else if (activeTimesCarry) {
                onTimesCarryInkChange?.(
                  activeTimesCarry.row,
                  activeTimesCarry.col,
                  strokes,
                );
              } else {
                onAnswerInkChange(
                  setBoxStrokes(answerInk, activeBox, strokes),
                );
              }
              if (strokes.length <= prev) {
                cancelAdvance();
                return;
              }
              cancelAdvance();
              advanceTimerRef.current = setTimeout(() => {
                advanceTimerRef.current = null;
                const seq = fillSequence(
                  shape,
                  layout,
                  expectedCarries,
                  multInfo,
                  null,
                );
                const next = nextEmptyBox(
                  seq,
                  activeBox,
                  latestInkRef.current,
                  latestCarryInkRef.current,
                  latestPartialInkRef.current,
                  latestTimesCarryRef.current,
                  latestDivisionDraftRef.current,
                );
                setActiveBox(next);
              }, ADVANCE_DELAY_MS);
            }}
            onClearAll={clearAllAnswers}
            onDone={() => setActiveBox(null)}
            tone={tone}
          />
        </View>
      ) : (
        <View style={styles.bottomRegion}>
          <TipBubble
            id="tap-answer-box"
            when={frontierBox(answerInk, shape, layout) !== null}
            text={t('practice.tips.tapAnswerBox')}
            pointer="up"
            style={styles.bottomTip}
          />
          {scratch}
        </View>
      )}

      {activeBox ? null : toolbar}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  layoutToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  problemArea: { paddingVertical: spacing.sm },
  problemScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Long division: outer padding around the bracket. No horizontal scroll
  // wraps this — the bracket header (divisor + dividend) is statically
  // positioned, and the draft area below carries its own horizontal +
  // vertical scrolls.
  longBody: { padding: spacing.lg },
  // Flex frame that holds the long-division layout; biased a bit larger
  // than the writing pad below (bottomRegion is flex:1) so the draft grid
  // has room to grow before the kid has to scroll. `overflow: 'hidden'`
  // clips the bracket's interior to the frame so the draft never spills
  // into the writing/scratch area below when the layout reshuffles (e.g.
  // when the kid finishes and the scratch toolbar appears).
  longArea: { flex: 1.3, overflow: 'hidden' },
  divisionInline: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  bottomRegion: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bottomTip: { marginBottom: spacing.sm },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scratchLabel: {
    flex: 1,
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
