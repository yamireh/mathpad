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
  useWindowDimensions,
  View,
} from 'react-native';

import { digitInk } from '../../lib/solver/digitInk';

import { TipBubble } from '../ui';
import { colors, spacing } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
import { AnswerArea } from './AnswerArea';
import { DivisionDraftGrid } from './DivisionDraftGrid';
import { ProblemDisplay } from './ProblemDisplay';
import { ScratchCanvas, type ScratchCanvasHandle } from './ScratchCanvas';
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
  divisionDraftSize,
  divisionSizing,
  DIVISION_DRAFT_CELL_WIDTH,
  DIVISION_MINUS_WIDTH,
  DIVISION_QUOTIENT_HEIGHT,
  partialWidths,
} from './layout';
import {
  fillSequence,
  lastDraftInkRow,
  LayoutToggle,
  type MultiplicationInfo,
  multiOperandCarries,
  nextEmptyBox,
  PadRegion,
  parseDivisionDraftId,
  parsePartialId,
  parseTimesCarryId,
  partialProductValues,
  ScratchToolbar,
  useSolver,
} from './workspace';

/** Idle time after the last stroke before auto-advancing to the next box. */
const ADVANCE_DELAY_MS = 300;

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
  /** Undo the last ink change on this question. */
  onUndo?: () => void;
  /** Whether there's anything to undo (controls the button's enabled state). */
  canUndo?: boolean;
  /** Wipes this question's undo stack (called after Clear All). */
  onClearUndoHistory?: () => void;
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
    onUndo,
    canUndo = false,
    onClearUndoHistory,
    tone,
  }: QuestionWorkspaceProps,
  ref,
) {
  const { t } = useTranslation();
  const shape = answerShape(question);
  // Multi-digit × starts on the units cell of partial 0 (where the kid
  // actually begins the long-multiplication walk) instead of the sum row.
  // `padCollapsed` lets the kid temporarily hide the writing pad to use
  // scratch without losing their active box. Re-expanded via the small
  // chevron-up handle that appears on top of scratch.
  const [padCollapsed, setPadCollapsed] = useState(false);
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
  const [padNonce, setPadNonce] = useState(0);
  // Bumping the nonce for a cell id triggers a one-shot drop animation
  // on that draft cell (used by the long-division auto-solver).
  const [bringDownPulse, setBringDownPulse] = useState<{
    cellId: string;
    nonce: number;
  } | null>(null);
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

  // Whenever the active box changes (auto-advance, fresh tap, new question),
  // re-expand the pad. Collapsed state is per-tap, not sticky.
  useEffect(() => {
    setPadCollapsed(false);
  }, [activeBox]);

  // Sequential fill: tapping a still-locked box snaps to the next box to fill.
  // Carry / partial / times-carry / division-draft boxes are always writable
  // (they're working-out, not the recognised answer).
  const selectBox = (boxId: string) => {
    cancelAdvance();
    // Re-tapping a box should always re-open the pad if it was collapsed.
    setPadCollapsed(false);
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

  // Clear every input on this question: answer, scratch, carry, partials,
  // times-carry, division draft, and borrow marks. Returns focus to the
  // first writable box.
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
    if (onToggleBorrow && borrowMarks) {
      // toggleBorrow flips state — calling it once per marked column clears.
      for (const col of borrowMarks) onToggleBorrow(col);
    }

    // Clear All also wipes the undo history — cleared work should not be
    // resurrectable by tapping undo.
    onClearUndoHistory?.();

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
  });

  useImperativeHandle(ref, () => ({ solve }), [solve]);

  const scratch = (
    <ScratchCanvas
      ref={scratchRef}
      tool="pen"
      bordered={!isLongDivision}
      initialStrokes={scratchInk}
      onStrokesChange={onScratchInkChange}
      accessibilityLabel={t('a11y.scratchCanvas')}
    />
  );

  const toolbar = (
    <ScratchToolbar
      onClear={() => scratchRef.current?.clear()}
      onUndo={() => scratchRef.current?.undo()}
    />
  );

  const layoutToggle =
    isDivision && onLayoutChange ? (
      <LayoutToggle
        isLongDivision={isLongDivision}
        tone={tone}
        onChange={onLayoutChange}
        inlineLayout={inlineLayout}
      />
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
          bringDownPulse={bringDownPulse}
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
          <PadRegion
            activeBox={activeBox}
            padNonce={padNonce}
            collapsed={padCollapsed}
            onToggleCollapsed={() => setPadCollapsed((c) => !c)}
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
                onAnswerInkChange(setBoxStrokes(answerInk, activeBox, strokes));
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
            onUndo={onUndo}
            canUndo={canUndo}
          />
        ) : isLongDivision ? null : (
          <View style={styles.bottomRegion}>
            {toolbar}
            {scratch}
          </View>
        )}
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
        <PadRegion
          activeBox={activeBox}
          padNonce={padNonce}
          collapsed={padCollapsed}
          onToggleCollapsed={() => setPadCollapsed((c) => !c)}
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
              onPartialInkChange?.(activePartial.row, activePartial.col, strokes);
            } else if (activeTimesCarry) {
              onTimesCarryInkChange?.(
                activeTimesCarry.row,
                activeTimesCarry.col,
                strokes,
              );
            } else {
              onAnswerInkChange(setBoxStrokes(answerInk, activeBox, strokes));
            }
            if (strokes.length <= prev) {
              cancelAdvance();
              return;
            }
            cancelAdvance();
            advanceTimerRef.current = setTimeout(() => {
              advanceTimerRef.current = null;
              const seq = fillSequence(shape, layout, expectedCarries, multInfo, null);
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
          onUndo={onUndo}
          canUndo={canUndo}
        />
      ) : (
        <View style={styles.bottomRegion}>
          {toolbar}
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Enough headroom up top that the borrow-arrow's `+10` label (which
  // floats ~24pt above the arc peak — itself a touch above the first
  // digit row) doesn't get clipped by the practice top bar.
  problemArea: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  problemScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    // Inner top padding so the borrow-arrow's "+10" label has room to
    // float above the first digit row inside the horizontal ScrollView,
    // which would otherwise clip it.
    paddingTop: spacing.lg,
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
});
