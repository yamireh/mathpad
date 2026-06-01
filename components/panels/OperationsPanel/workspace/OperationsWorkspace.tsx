/**
 * OperationsWorkspace — the practice-screen surface that hosts whichever
 * per-operation panel matches the current question. Builds the shared
 * `WorkspaceCore` (state, refs, handlers, derived data) once per render
 * and hands it to one of:
 *
 *   - AdditionPanel
 *   - SubtractionPanel
 *   - MultiplicationPanel
 *   - DivisionPanel
 *
 * Exposes the auto-solve trigger via `ref` so practice and review can
 * still trigger the demo solver.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions } from 'react-native';

import { digitInk } from '../../../../lib/solver/digitInk';
import { computeSolvePlan } from '../../../../lib/solver/solveValues';
import type { ProblemLayout, Question } from '../../../../types';
import {
  type AnswerInk,
  emptyAnswerInk,
  frontierBox,
  getBoxStrokes,
  type InkStroke,
  isBoxWritable,
  setBoxStrokes,
} from '../../../domain/ink';
import {
  answerShape,
  digitCount,
  longDivisionDivisorCarries,
  longDivisionStepMinuends,
  multiplicationDigitOperands,
  partialWidths,
  verticalGeometry,
} from '../../../domain/layout';
import type { ScratchCanvasHandle } from '../../../domain/ScratchCanvas';
import {
  type MultiplicationInfo,
  multiOperandCarries,
  parseDivisionCarryId,
  parseDivisionDraftId,
  parsePartialId,
  parseTimesCarryId,
  partialProductValues,
  useSolver,
  type WorkspaceCore,
} from '../../../domain/workspace';
import { AdditionPanel } from './AdditionPanel';
import { DivisionPanel } from './DivisionPanel';
import { MultiplicationPanel } from './MultiplicationPanel';
import { SubtractionPanel } from './SubtractionPanel';

export interface OperationsWorkspaceProps {
  question: Question;
  layout: ProblemLayout;
  answerInk: AnswerInk;
  onAnswerInkChange: (ink: AnswerInk) => void;
  scratchInk?: InkStroke[];
  onScratchInkChange: (strokes: InkStroke[]) => void;
  borrowMarks?: number[];
  onToggleBorrow?: (column: number) => void;
  divisionBorrowMarks?: number[][];
  onToggleDivisionBorrow?: (step: number, lenderIndex: number) => void;
  carryInk?: InkStroke[][];
  onCarryInkChange?: (column: number, strokes: InkStroke[]) => void;
  partialInk?: InkStroke[][][];
  onPartialInkChange?: (
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  timesCarryInk?: InkStroke[][][];
  onTimesCarryInkChange?: (
    partialRow: number,
    op1Col: number,
    strokes: InkStroke[],
  ) => void;
  divisionDraftInk?: InkStroke[][][];
  onDivisionDraftInkChange?: (
    row: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  divisionCarryInk?: InkStroke[][][];
  onDivisionCarryInkChange?: (
    step: number,
    col: number,
    strokes: InkStroke[],
  ) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onClearUndoHistory?: () => void;
  /** Flag the current question as Auto-Solved (shows Fixed badge on Results). */
  onSolved?: () => void;
  tone: string;
}

export interface OperationsWorkspaceHandle {
  /** Auto-solve the current question, animating digit-by-digit. */
  solve: () => void;
}

export const OperationsWorkspace = forwardRef<
  OperationsWorkspaceHandle,
  OperationsWorkspaceProps
>(function OperationsWorkspace(props, ref) {
  const {
    question,
    layout,
    answerInk,
    onAnswerInkChange,
    scratchInk,
    onScratchInkChange,
    borrowMarks,
    onToggleBorrow,
    divisionBorrowMarks,
    onToggleDivisionBorrow,
    carryInk,
    onCarryInkChange,
    partialInk,
    onPartialInkChange,
    timesCarryInk,
    onTimesCarryInkChange,
    divisionDraftInk,
    onDivisionDraftInkChange,
    divisionCarryInk,
    onDivisionCarryInkChange,
    onUndo,
    canUndo = false,
    onClearUndoHistory,
    onSolved,
    tone,
  } = props;

  /* ------------------------- derived inputs ------------------------- */
  const shape = answerShape(question);
  const isLongDivision = layout === 'divisionLong';
  const isDivision = question.operation === 'division';

  /* ----------------------------- state ------------------------------ */
  const [padCollapsed, setPadCollapsed] = useState(false);
  const [activeBox, setActiveBox] = useState<string | null>(() => {
    if (question.operation === 'multiplication') {
      const [a1, a2] = multiplicationDigitOperands(question);
      const widths = partialWidths(a1, a2);
      if (widths && widths.length > 0) return `pp-0-${widths[0] - 1}`;
    }
    return frontierBox(answerInk, shape, layout);
  });
  const [padNonce, setPadNonce] = useState(0);
  const [bringDownPulse, setBringDownPulse] = useState<{
    cellId: string;
    nonce: number;
  } | null>(null);
  const scratchRef = useRef<ScratchCanvasHandle | null>(null);

  /* ---------------------- active-box box-id splits ---------------------- */
  const activeCarryColumn =
    activeBox && activeBox.startsWith('carry-')
      ? Number(activeBox.slice(6))
      : -1;
  const activePartial = activeBox ? parsePartialId(activeBox) : null;
  const activeTimesCarry = activeBox ? parseTimesCarryId(activeBox) : null;
  const activeDivisionDraft = activeBox
    ? parseDivisionDraftId(activeBox)
    : null;
  const activeDivisionCarry = activeBox
    ? parseDivisionCarryId(activeBox)
    : null;

  /* -------- partial-product times-carry binding (× only) -------- */
  const [currentPartialRow, setCurrentPartialRow] = useState(0);
  useEffect(() => {
    if (activePartial) setCurrentPartialRow(activePartial.row);
    else if (activeTimesCarry) setCurrentPartialRow(activeTimesCarry.row);
  }, [activePartial, activeTimesCarry]);

  /* -------- divisor-carry binding to the active quotient step (÷ only) -------- */
  const [currentDivisionStep, setCurrentDivisionStep] = useState(0);
  useEffect(() => {
    if (activeDivisionCarry) {
      setCurrentDivisionStep(activeDivisionCarry.row);
    } else if (activeDivisionDraft) {
      // Each step is a (product, difference) row pair: step = floor(row / 2).
      setCurrentDivisionStep(Math.floor(activeDivisionDraft.row / 2));
    } else if (activeBox?.startsWith('int-')) {
      setCurrentDivisionStep(Number(activeBox.slice(4)));
    } else if (activeBox?.startsWith('dec-')) {
      setCurrentDivisionStep(shape.integerBoxes + Number(activeBox.slice(4)));
    }
  }, [activeDivisionCarry, activeDivisionDraft, activeBox, shape.integerBoxes]);

  /* -------- per-step divisor-carry columns (long division only) -------- */
  const divisionStepCarryCols = useMemo<number[][]>(
    () => (isDivision ? longDivisionDivisorCarries(question) : []),
    [isDivision, question],
  );

  /* -------- per-step subtraction minuends + correct draft labels -------- */
  const divisionStepMinuends = useMemo(
    () => (isDivision ? longDivisionStepMinuends(question) : []),
    [isDivision, question],
  );
  const draftLabels = useMemo(() => {
    if (!isLongDivision) return new Map<string, number>();
    return computeSolvePlan(question, 'divisionLong').values;
  }, [isLongDivision, question]);
  // The draft row the kid is currently on. Rows ABOVE it (already moved past)
  // are candidates to lock into labels. A quotient digit for step k counts as
  // "about to write step k's product row" (row 2k).
  const activeDraftRow = useMemo(() => {
    if (activeDivisionDraft) return activeDivisionDraft.row;
    if (activeDivisionCarry) return 2 * activeDivisionCarry.row;
    if (activeBox?.startsWith('int-')) return 2 * Number(activeBox.slice(4));
    if (activeBox?.startsWith('dec-')) {
      return 2 * (shape.integerBoxes + Number(activeBox.slice(4)));
    }
    // Nothing focused (pad closed / reviewing) — every finished row may lock.
    return Number.MAX_SAFE_INTEGER;
  }, [activeDivisionDraft, activeDivisionCarry, activeBox, shape.integerBoxes]);

  // A draft row locks into read-only correct-digit labels once the kid has
  // moved BELOW it AND it's fully written (every solver-filled cell has ink).
  // Per-row (so a finished product row locks the instant you drop to its
  // difference row) and ink-based (so Undo, which restores the draft ink,
  // drops the lock and the handwriting returns).
  const lockedDraftRows = useMemo(() => {
    const set = new Set<number>();
    if (!isLongDivision) return set;
    const dInk = divisionDraftInk ?? [];
    const expected = new Map<number, number[]>();
    for (const key of draftLabels.keys()) {
      const m = /^dd-(\d+)-(\d+)$/.exec(key);
      if (!m) continue;
      const row = Number(m[1]);
      const col = Number(m[2]);
      const cols = expected.get(row);
      if (cols) cols.push(col);
      else expected.set(row, [col]);
    }
    for (const [row, cols] of expected) {
      if (row >= activeDraftRow) continue;
      if (cols.every((c) => (dInk[row]?.[c] ?? []).length > 0)) set.add(row);
    }
    return set;
  }, [isLongDivision, activeDraftRow, draftLabels, divisionDraftInk]);

  /* -------------- per-column expected-carries flags -------------- */
  const expectedCarries = useMemo<boolean[] | null>(() => {
    if (question.operation === 'addition') {
      // Over the full (integer + decimal) grid: scale operands to their digit
      // strings so carries — including across the decimal point — are covered.
      // Integer questions have decCols 0, so this matches the old behavior.
      const { intCols, decCols } = verticalGeometry(question);
      const scale = 10 ** decCols;
      return multiOperandCarries(
        [
          Math.round(Math.abs(question.operands[0]) * scale),
          Math.round(Math.abs(question.operands[1]) * scale),
        ],
        intCols + decCols,
      );
    }
    if (question.operation === 'multiplication') {
      // Partials/carries run on the operand digit strings (decimal × multiplies
      // the digits as integers); the sum spans the product's digit width.
      const [a1, a2] = multiplicationDigitOperands(question);
      return multiOperandCarries(
        partialProductValues(a1, a2),
        digitCount(a1 * a2),
      );
    }
    return null;
  }, [question, shape.integerBoxes]);

  const multInfo = useMemo<MultiplicationInfo | null>(() => {
    if (question.operation !== 'multiplication') return null;
    const [a1, a2] = multiplicationDigitOperands(question);
    const partials = partialWidths(a1, a2);
    if (!partials) return null;
    return { op1: a1, op2: a2, op1Cols: digitCount(a1), partials };
  }, [question]);
  const partialShape = multInfo?.partials ?? null;

  const { width: windowWidth } = useWindowDimensions();

  /* ------------------------ auto-advance refs ----------------------- */
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
  const latestDivisionCarryRef = useRef(divisionCarryInk);
  latestDivisionCarryRef.current = divisionCarryInk;

  const cancelAdvance = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);
  useEffect(() => cancelAdvance, [cancelAdvance]);

  /* -------- on activeBox change: reset collapse + stroke baseline -------- */
  useEffect(() => {
    setPadCollapsed(false);
  }, [activeBox]);
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
      lastStrokeCountRef.current = partialInk?.[pp.row]?.[pp.col]?.length ?? 0;
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
    const dc = parseDivisionCarryId(activeBox);
    if (dc) {
      lastStrokeCountRef.current =
        divisionCarryInk?.[dc.row]?.[dc.col]?.length ?? 0;
      return;
    }
    lastStrokeCountRef.current = getBoxStrokes(
      latestInkRef.current,
      activeBox,
    ).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBox]);

  /* ----------------------------- handlers ---------------------------- */
  const selectBox = (boxId: string) => {
    cancelAdvance();
    setPadCollapsed(false);
    if (
      boxId.startsWith('carry-') ||
      boxId.startsWith('pp-') ||
      boxId.startsWith('tcarry-') ||
      boxId.startsWith('dd-') ||
      boxId.startsWith('dcarry-')
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

  const clearAllAnswers = () => {
    cancelAdvance();
    const empty = emptyAnswerInk(shape);
    onAnswerInkChange(empty);
    scratchRef.current?.clear();
    if (onCarryInkChange && carryInk) {
      for (let col = 0; col < carryInk.length; col += 1) {
        if (carryInk[col]?.length) onCarryInkChange(col, []);
      }
    }
    if (onPartialInkChange && partialInk) {
      for (let row = 0; row < partialInk.length; row += 1) {
        const rowInk = partialInk[row];
        if (!rowInk) continue;
        for (let col = 0; col < rowInk.length; col += 1) {
          if (rowInk[col]?.length) onPartialInkChange(row, col, []);
        }
      }
    }
    if (onTimesCarryInkChange && timesCarryInk) {
      for (let row = 0; row < timesCarryInk.length; row += 1) {
        const rowInk = timesCarryInk[row];
        if (!rowInk) continue;
        for (let col = 0; col < rowInk.length; col += 1) {
          if (rowInk[col]?.length) onTimesCarryInkChange(row, col, []);
        }
      }
    }
    if (onDivisionDraftInkChange && divisionDraftInk) {
      for (let row = 0; row < divisionDraftInk.length; row += 1) {
        const rowInk = divisionDraftInk[row];
        if (!rowInk) continue;
        for (let col = 0; col < rowInk.length; col += 1) {
          if (rowInk[col]?.length) onDivisionDraftInkChange(row, col, []);
        }
      }
    }
    if (onDivisionCarryInkChange && divisionCarryInk) {
      for (let step = 0; step < divisionCarryInk.length; step += 1) {
        const stepInk = divisionCarryInk[step];
        if (!stepInk) continue;
        for (let col = 0; col < stepInk.length; col += 1) {
          if (stepInk[col]?.length) onDivisionCarryInkChange(step, col, []);
        }
      }
    }
    if (onToggleBorrow && borrowMarks) {
      for (const col of borrowMarks) onToggleBorrow(col);
    }
    if (onToggleDivisionBorrow && divisionBorrowMarks) {
      for (let step = 0; step < divisionBorrowMarks.length; step += 1) {
        for (const lender of divisionBorrowMarks[step] ?? []) {
          onToggleDivisionBorrow(step, lender);
        }
      }
    }
    onClearUndoHistory?.();
    setActiveBox(frontierBox(empty, shape, layout));
    setPadNonce((n) => n + 1);
  };

  const clearBox = (boxId: string) => {
    cancelAdvance();
    if (boxId.startsWith('carry-')) {
      onCarryInkChange?.(Number(boxId.slice(6)), []);
    } else {
      const pp = parsePartialId(boxId);
      const tc = parseTimesCarryId(boxId);
      const dd = parseDivisionDraftId(boxId);
      const dc = parseDivisionCarryId(boxId);
      if (pp) onPartialInkChange?.(pp.row, pp.col, []);
      else if (tc) onTimesCarryInkChange?.(tc.row, tc.col, []);
      else if (dd) onDivisionDraftInkChange?.(dd.row, dd.col, []);
      else if (dc) onDivisionCarryInkChange?.(dc.row, dc.col, []);
      else onAnswerInkChange(setBoxStrokes(answerInk, boxId, []));
    }
    lastStrokeCountRef.current = 0;
    setActiveBox(boxId);
    setPadNonce((n) => n + 1);
  };

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
      const dc = parseDivisionCarryId(boxId);
      if (dc) {
        onDivisionCarryInkChange?.(dc.row, dc.col, strokes);
        return;
      }
      onAnswerInkChange(setBoxStrokes(latestInkRef.current, boxId, strokes));
    },
    [
      onAnswerInkChange,
      onCarryInkChange,
      onDivisionCarryInkChange,
      onDivisionDraftInkChange,
      onPartialInkChange,
      onTimesCarryInkChange,
    ],
  );

  const { solve } = useSolver({
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
  });
  useImperativeHandle(ref, () => ({ solve }), [solve]);

  /* --------------------------- core bundle --------------------------- */
  const core: WorkspaceCore = {
    question,
    layout,
    tone,
    answerInk,
    onAnswerInkChange,
    scratchInk,
    onScratchInkChange,
    borrowMarks,
    onToggleBorrow,
    divisionBorrowMarks,
    onToggleDivisionBorrow,
    carryInk,
    onCarryInkChange,
    partialInk,
    onPartialInkChange,
    timesCarryInk,
    onTimesCarryInkChange,
    divisionDraftInk,
    onDivisionDraftInkChange,
    divisionCarryInk,
    onDivisionCarryInkChange,
    onUndo,
    canUndo,

    shape,
    isLongDivision,
    expectedCarries,
    multInfo,
    partialShape,
    divisionStepCarryCols,
    divisionStepMinuends,
    lockedDraftRows,
    draftLabels,
    windowWidth,

    activeBox,
    activeCarryColumn,
    activePartial,
    activeTimesCarry,
    activeDivisionDraft,
    activeDivisionCarry,

    padCollapsed,
    padNonce,
    bringDownPulse,
    currentPartialRow,
    currentDivisionStep,

    scratchRef,
    advanceTimerRef,
    lastStrokeCountRef,
    latestInkRef,
    latestCarryInkRef,
    latestPartialInkRef,
    latestTimesCarryRef,
    latestDivisionDraftRef,
    latestDivisionCarryRef,

    setActiveBox,
    setPadCollapsed,
    setPadNonce,

    selectBox,
    clearBox,
    clearAllAnswers,
    cancelAdvance,
  };

  /* ----------------------- per-operation dispatch ---------------------- */
  switch (question.operation) {
    case 'addition':
      return <AdditionPanel core={core} />;
    case 'subtraction':
      return <SubtractionPanel core={core} />;
    case 'multiplication':
      return <MultiplicationPanel core={core} />;
    case 'division':
      return <DivisionPanel core={core} />;
  }
});
