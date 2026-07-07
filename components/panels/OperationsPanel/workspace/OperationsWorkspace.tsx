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
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NoticeDialog } from '../../../ui';
import {
  scratchAudible,
  scratchMute,
  scratchStop,
} from '../../../../lib/feedback';
import { recognizeDigit } from '../../../../lib/recognition';
import { digitInk } from '../../../../lib/solver/digitInk';
import type { ReviewMarks } from '../../../../lib/review';
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
  divisionDraftSize,
  longDivisionDivisorCarries,
  longDivisionStepMinuends,
  multiplicationDigitOperands,
  partialWidths,
  verticalGeometry,
} from '../../../domain/layout';
import {
  CursorTargetProvider,
  type CursorTarget,
  type CursorTargetValue,
  type MeasurableNode,
} from '../../../domain/cursorTarget';
import { HandCursor } from '../../../domain/HandCursor';
import type { ScratchCanvasHandle } from '../../../domain/ScratchCanvas';
import {
  type DivisionDraftMeta,
  fillSequence,
  type MultiplicationInfo,
  nextEmptyBox,
  additionCarries,
  multiOperandCarries,
  parseDivisionCarryId,
  parseDivisionDraftId,
  parsePartialId,
  parseTimesCarryId,
  partialProductValues,
  recognizeAnswerCell,
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
  /** Undo the last edit. May return the reverted box id so focus returns to it. */
  onUndo?: () => string | null | void;
  canUndo?: boolean;
  onClearUndoHistory?: () => void;
  /** Flag the current question as Auto-Solved (shows Fixed badge on Results). */
  onSolved?: () => void;
  /**
   * Review error-highlight marks keyed by box id. When set, boxes render
   * green/red borders and long-division draft rows stop locking into correct
   * labels so the kid's own ink stays visible. Null/absent during practice.
   */
  errorMarks?: ReviewMarks | null;
  /**
   * When true, clearing a box (its little ✕) also clears every box that comes
   * AFTER it in the solving order — once an upstream digit changes, everything
   * downstream is stale. Used on the review/fix screen; off during practice.
   */
  cascadeClear?: boolean;
  tone: string;
}

export interface OperationsWorkspaceHandle {
  /** Auto-solve the current question, animating digit-by-digit. */
  solve: () => void;
  /** Hint: animate just the next single step (the next empty cell). */
  solveStep: () => void;
}

/** Demo pencil sound during auto-solve. Off for now; flip to re-enable. */
const DEMO_SCRATCH_SOUND = false;

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
    errorMarks,
    cascadeClear = false,
    tone,
  } = props;

  const { t } = useTranslation();

  /* ------------------------- derived inputs ------------------------- */
  const shape = answerShape(question);
  const isLongDivision = layout === 'divisionLong';
  const isDivision = question.operation === 'division';

  /* ----------------------------- state ------------------------------ */
  const [padCollapsed, setPadCollapsed] = useState(false);
  // Live-recognition notice: unreadable ink ('invalid') or more than one digit
  // written in a single box ('multi'). Null = no notice showing.
  const [notice, setNotice] = useState<'invalid' | 'multi' | null>(null);
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

  /* ---------------- demo hand cursor (auto-solve only) ---------------- */
  const rootRef = useRef<View>(null);
  const [cursorActive, setCursorActive] = useState(false);
  // Answer boxes whose digit was filled by a hint — rendered in a hint colour.
  const [hintedBoxes, setHintedBoxes] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Where the hand writes (pad) and where it taps (a borrowed digit), kept
  // separate so switching modes springs between the two.
  const [padTarget, setPadTarget] = useState<CursorTarget | null>(null);
  const [borrowTarget, setBorrowTarget] = useState<CursorTarget | null>(null);
  const [handMode, setHandMode] = useState<'write' | 'tap'>('write');
  const [traceDigit, setTraceDigit] = useState(0);
  // Bumped once per action; also gates the hand visible (0 until the first
  // borrow tap or digit write).
  const [actionNonce, setActionNonce] = useState(0);
  // Measure a host node into root-relative coordinates (the overlay fills the
  // root) and hand its centre to `cb`.
  const measureToRoot = useCallback(
    (node: MeasurableNode | null, cb: (p: CursorTarget) => void) => {
      if (!node || !rootRef.current) return;
      rootRef.current.measureInWindow((rootX, rootY) => {
        node.measureInWindow((x, y, w, h) => {
          cb({ x: x - rootX + w / 2, y: y - rootY + h / 2 });
        });
      });
    },
    [],
  );
  const reportPad = useCallback(
    (node: MeasurableNode | null) => {
      if (!node) return setPadTarget(null);
      measureToRoot(node, setPadTarget);
    },
    [measureToRoot],
  );
  // Borrow-lender cells register their host node by column so the hand can be
  // moved there ahead of the borrow being triggered.
  const borrowCellsRef = useRef(new Map<number, MeasurableNode>());
  const registerBorrowCell = useCallback(
    (column: number, node: MeasurableNode | null) => {
      if (node) borrowCellsRef.current.set(column, node);
      else borrowCellsRef.current.delete(column);
    },
    [],
  );
  // Glide the hand up to the lender digit (the borrow is triggered separately,
  // once the hand has arrived — see useSolver's HAND_MOVE_MS gap).
  const onBorrowApproach = useCallback(
    (column: number) => {
      const node = borrowCellsRef.current.get(column);
      if (!node) return;
      measureToRoot(node, (p) => {
        // Drop the hand below the digit so it doesn't cover the cross-out,
        // the "+10" annotation, or the borrow arrow above it.
        setBorrowTarget({ x: p.x, y: p.y + 26 });
        setHandMode('tap');
        setActionNonce((n) => n + 1);
      });
    },
    [measureToRoot],
  );
  const cursorValue = useMemo<CursorTargetValue>(
    () => ({ enabled: cursorActive, reportPad, registerBorrowCell }),
    [cursorActive, reportPad, registerBorrowCell],
  );

  // Play the same looping pencil sound the kid hears, for the span of each
  // traced digit (the auto-solver writes via writeBox, which never touches the
  // pad's own stroke capture, so we drive the sound here).
  const scratchMuteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopScratch = useCallback(() => {
    if (scratchMuteRef.current) {
      clearTimeout(scratchMuteRef.current);
      scratchMuteRef.current = null;
    }
    scratchStop();
  }, []);
  const startScratch = useCallback(() => {
    if (!DEMO_SCRATCH_SOUND) return;
    if (scratchMuteRef.current) clearTimeout(scratchMuteRef.current);
    scratchAudible();
    // Mute (but keep the loop running) when the digit's strokes are done.
    scratchMuteRef.current = setTimeout(() => {
      scratchMuteRef.current = null;
      scratchMute();
    }, 1100);
  }, []);

  // Reset the hand whenever the question changes.
  useEffect(() => {
    setCursorActive(false);
    setPadTarget(null);
    setBorrowTarget(null);
    setActionNonce(0);
    stopScratch();
  }, [question.id, stopScratch]);
  useEffect(() => stopScratch, [stopScratch]);

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
    // In review's "Show errors" pass, never lock rows into correct labels —
    // the kid's own (possibly wrong) ink must stay visible to be marked.
    if (errorMarks) return set;
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
  }, [isLongDivision, activeDraftRow, draftLabels, divisionDraftInk, errorMarks]);

  /* -------------- per-column expected-carries flags -------------- */
  const expectedCarries = useMemo<boolean[] | null>(() => {
    if (question.operation === 'addition') {
      // Over the full (integer + decimal) grid so carries — including across the
      // decimal point — are covered. The final carry-out of the leftmost operand
      // column is suppressed: it has no column to add into, so the kid writes it
      // straight into the answer's leading box (no carry box + bring-down).
      const { intCols, decCols } = verticalGeometry(question);
      return additionCarries(
        question.operands[0],
        question.operands[1],
        intCols,
        decCols,
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

  // Clear a set of boxes in one pass: answer boxes fold into a single
  // AnswerInk update, the rest route through their per-cell handlers. Each
  // clear is guarded on actual ink so empty cells don't churn state/undo.
  const clearBoxes = (ids: string[]) => {
    let nextAnswer = answerInk;
    for (const id of ids) {
      if (id.startsWith('carry-')) {
        const c = Number(id.slice(6));
        if (carryInk?.[c]?.length) onCarryInkChange?.(c, []);
        continue;
      }
      const pp = parsePartialId(id);
      if (pp) {
        if (partialInk?.[pp.row]?.[pp.col]?.length) {
          onPartialInkChange?.(pp.row, pp.col, []);
        }
        continue;
      }
      const tc = parseTimesCarryId(id);
      if (tc) {
        if (timesCarryInk?.[tc.row]?.[tc.col]?.length) {
          onTimesCarryInkChange?.(tc.row, tc.col, []);
        }
        continue;
      }
      const dd = parseDivisionDraftId(id);
      if (dd) {
        if (divisionDraftInk?.[dd.row]?.[dd.col]?.length) {
          onDivisionDraftInkChange?.(dd.row, dd.col, []);
        }
        continue;
      }
      const dc = parseDivisionCarryId(id);
      if (dc) {
        if (divisionCarryInk?.[dc.row]?.[dc.col]?.length) {
          onDivisionCarryInkChange?.(dc.row, dc.col, []);
        }
        continue;
      }
      if (getBoxStrokes(nextAnswer, id).length) {
        nextAnswer = setBoxStrokes(nextAnswer, id, []);
      }
    }
    if (nextAnswer !== answerInk) onAnswerInkChange(nextAnswer);
  };

  const clearBox = (boxId: string) => {
    cancelAdvance();
    if (cascadeClear) {
      // Fixing flow: clear this box and everything downstream of it, since an
      // upstream change invalidates every box solved after it.
      const draftMeta: DivisionDraftMeta | null = (() => {
        if (!isLongDivision) return null;
        const ds = divisionDraftSize(question.operands[0]);
        if (ds.rows === 0) return null;
        return {
          columns: ds.columns,
          rows: 2 * (shape.integerBoxes + shape.decimalBoxes),
          divisorDigits: digitCount(question.operands[1]),
          divisorCarryCols: divisionStepCarryCols,
        };
      })();
      const seq = fillSequence(shape, layout, expectedCarries, multInfo, draftMeta);
      const idx = seq.indexOf(boxId);
      clearBoxes(idx >= 0 ? seq.slice(idx) : [boxId]);
    } else {
      clearBoxes([boxId]);
    }
    lastStrokeCountRef.current = 0;
    setActiveBox(boxId);
    setPadNonce((n) => n + 1);
  };

  // Live recognition of a single final-answer digit cell, the moment the kid
  // pauses on it (called from the auto-advance tick). A recognized digit's raw
  // ink is swapped for a clean canonical glyph — the same `digitInk` the hint
  // writer uses, so Finish re-recognizes it identically. Unreadable scribble is
  // cleared and the kid is prompted to try again. No-op outside practice
  // (review's "Show errors" keeps the kid's original ink) and for non-answer
  // cells (sign box + all working cells stay untouched).
  const commitAnswerBox = useCallback(
    async (boxId: string | null): Promise<'ok' | 'invalid' | 'multi' | 'skip'> => {
      if (!boxId || errorMarks) return 'skip';
      const kind = boxId.split('-')[0];
      if (kind !== 'int' && kind !== 'dec' && kind !== 'rem') return 'skip';
      const strokes = getBoxStrokes(latestInkRef.current, boxId);
      const verdict = await recognizeAnswerCell(strokes, recognizeDigit);
      if (verdict.kind === 'skip') return 'skip';
      if (verdict.kind === 'ok') {
        onAnswerInkChange(
          setBoxStrokes(latestInkRef.current, boxId, digitInk(verdict.digit)),
        );
        return 'ok';
      }
      // 'invalid' (unreadable) or 'multi' (two digits in one box): clear the box,
      // show the matching notice, and hold focus here rather than advancing.
      onAnswerInkChange(setBoxStrokes(latestInkRef.current, boxId, []));
      lastStrokeCountRef.current = 0;
      setActiveBox(boxId);
      setPadNonce((n) => n + 1);
      setNotice(verdict.kind);
      return verdict.kind;
    },
    [errorMarks, onAnswerInkChange],
  );

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

  const { solve, solveStep } = useSolver({
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
    // Each digit step: start the hand writing this digit on the pad, with the
    // pencil sound for the span of the trace.
    onFocusBox: (_id, digit) => {
      setTraceDigit(digit);
      setHandMode('write');
      setActionNonce((n) => n + 1);
      startScratch();
    },
    onToggleBorrow,
    onBorrowApproach,
    onDivisionBorrow: onToggleDivisionBorrow,
    setBringDownPulse,
    onSolved,
    onComplete: () => {
      setCursorActive(false);
      setPadTarget(null);
      setBorrowTarget(null);
      setActionNonce(0);
      stopScratch();
    },
    // Let the hand finish writing before the digit reflects into the box, and
    // give each step room to play out at a calm pace.
    writeLeadMs: 1080,
    stepMs: 1700,
  });
  // Show the hand cursor for the duration of an auto-solve.
  const runSolve = useCallback(() => {
    setCursorActive(true);
    solve();
  }, [solve]);

  // Hint: animate just the next empty cell (the next solve step).
  const runSolveStep = useCallback(() => {
    const plan = computeSolvePlan(question, layout);
    const draftMeta: DivisionDraftMeta | null =
      isLongDivision && divisionDraftSize(question.operands[0]).rows > 0
        ? {
            columns: divisionDraftSize(question.operands[0]).columns,
            rows: 2 * (shape.integerBoxes + shape.decimalBoxes),
            divisorDigits: digitCount(question.operands[1]),
            divisorCarryCols: divisionStepCarryCols,
          }
        : null;
    const seq = fillSequence(
      shape,
      layout,
      expectedCarries,
      multInfo,
      draftMeta,
      // Skip draft cells with no expected digit (unused leading cells of a
      // short/zero difference) so navigation never targets them.
    ).filter((id) => !id.startsWith('dd-') || plan.values.has(id));
    // First empty cell (in fill order) that has a known value.
    let cursor = '';
    let target: { id: string; value: number } | null = null;
    for (;;) {
      const empty = nextEmptyBox(
        seq,
        cursor,
        latestInkRef.current,
        latestCarryInkRef.current,
        latestPartialInkRef.current,
        latestTimesCarryRef.current,
        latestDivisionDraftRef.current,
        latestDivisionCarryRef.current,
      );
      if (!empty) break;
      const value = plan.values.get(empty);
      if (typeof value === 'number') {
        target = { id: empty, value };
        break;
      }
      cursor = empty;
    }
    if (!target) return;
    // The box to focus once the digit lands — the next empty cell after it, so
    // the kid carries on from where the hint left off.
    const focusAfter = nextEmptyBox(
      seq,
      target.id,
      latestInkRef.current,
      latestCarryInkRef.current,
      latestPartialInkRef.current,
      latestTimesCarryRef.current,
      latestDivisionDraftRef.current,
      latestDivisionCarryRef.current,
    );
    setHintedBoxes((prev) => new Set(prev).add(target.id));
    setCursorActive(true);
    solveStep(target.id, target.value, focusAfter);
  }, [
    divisionStepCarryCols,
    expectedCarries,
    isLongDivision,
    layout,
    multInfo,
    question,
    shape,
    solveStep,
  ]);

  useImperativeHandle(ref, () => ({ solve: runSolve, solveStep: runSolveStep }), [
    runSolve,
    runSolveStep,
  ]);

  // Undo, then return focus to the box that was just reverted (it may not be
  // the active one — auto-advance moves focus on after each write).
  const handleUndo = useCallback(() => {
    const box = onUndo?.();
    if (typeof box === 'string') {
      cancelAdvance();
      setActiveBox(box);
    }
  }, [onUndo, cancelAdvance]);

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
    onUndo: handleUndo,
    canUndo,
    errorMarks,
    hintedBoxes,

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
    commitAnswerBox,
  };

  /* ----------------------- per-operation dispatch ---------------------- */
  const panel = (() => {
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
  })();

  return (
    <CursorTargetProvider value={cursorValue}>
      <View ref={rootRef} collapsable={false} style={styles.root}>
        {panel}
        {cursorActive ? (
          <HandCursor
            target={
              !activeBox
                ? null
                : actionNonce === 0
                  ? // Start parked at the pad (the touch surface) before the
                    // first action, then glide wherever it's needed.
                    padTarget
                  : handMode === 'write'
                    ? padTarget
                    : borrowTarget
            }
            mode={handMode}
            digit={traceDigit}
            actionNonce={actionNonce}
          />
        ) : null}
        <NoticeDialog
          visible={notice !== null}
          title={t(notice === 'multi' ? 'practice.multiTitle' : 'practice.invalidTitle')}
          message={t(notice === 'multi' ? 'practice.multiBody' : 'practice.invalidBody')}
          buttonLabel={t('common.gotIt')}
          onDismiss={() => setNotice(null)}
        />
      </View>
    </CursorTargetProvider>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
