/**
 * CompactBody — the +/−/× practice layout: small column-aligned answer
 * boxes inside `ProblemDisplay`, scrolling horizontally on narrow
 * screens, with a pop-up writing pad anchored at the bottom and a
 * free-form scratch canvas underneath when no box is focused.
 *
 * Per-operation panels (AdditionPanel, SubtractionPanel,
 * MultiplicationPanel) all render this body — operation-specific
 * differences (carry boxes, borrow marks, partial-product rows) are
 * carried inside `core` and only their relevant subset feeds into
 * `ProblemDisplay`.
 */
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { TipBubble } from '../../ui';
import { spacing } from '../../../constants/design';
import { AnswerArea } from '../AnswerArea';
import { ProblemDisplay } from '../problem';
import { ScratchCanvas } from '../ScratchCanvas';
import {
  frontierBox,
  getBoxStrokes,
  isBoxWritable,
  setBoxStrokes,
} from '../ink';
import {
  compactSizing,
  digitCount,
  type ProblemSizing,
} from '../layout';
import { fillSequence } from './fillSequence';
import { nextEmptyBox } from './nextEmptyBox';
import { PadRegion } from './PadRegion';
import { ScratchToolbar } from './ScratchToolbar';
import type { WorkspaceCore } from './types';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { AnswerShape } from '../layout';

/** Idle time after the last stroke before auto-advancing to the next box. */
const ADVANCE_DELAY_MS = 300;

/**
 * How many columns the active box sits from the right (units) edge — used to
 * keep it on-screen as the kid auto-advances leftward. Approximate (ignores
 * the half-cell decimal-dot column), which the scroll lead absorbs.
 */
function activeColsFromRight(
  boxId: string,
  shape: AnswerShape,
  partialWidths: number[] | null,
  op1Cols: number,
): number {
  const total = shape.integerBoxes + shape.decimalBoxes;
  if (boxId.startsWith('dec-')) {
    return shape.decimalBoxes - 1 - Number(boxId.slice(4));
  }
  if (boxId.startsWith('int-')) {
    return shape.decimalBoxes + (shape.integerBoxes - 1 - Number(boxId.slice(4)));
  }
  if (boxId.startsWith('carry-')) {
    return total - 1 - Number(boxId.slice(6));
  }
  const pp = /^pp-(\d+)-(\d+)$/.exec(boxId);
  if (pp) {
    const row = Number(pp[1]);
    const col = Number(pp[2]);
    const width = partialWidths?.[row] ?? 1;
    return row + (width - 1 - col); // shifted left by `row` place-value zeros
  }
  const tc = /^tcarry-(\d+)-(\d+)$/.exec(boxId);
  if (tc) return op1Cols - 1 - Number(tc[2]);
  return 0;
}

export interface CompactBodyProps {
  core: WorkspaceCore;
}

export function CompactBody({ core }: CompactBodyProps) {
  const { t } = useTranslation();
  const problemScrollRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const { width: windowWidth } = useWindowDimensions();
  const {
    question,
    layout,
    tone,
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
    onUndo,
    canUndo,
    errorMarks,
    shape,
    expectedCarries,
    multInfo,
    partialShape,
    currentPartialRow,
    activeBox,
    activeCarryColumn,
    activePartial,
    activeTimesCarry,
    padCollapsed,
    padNonce,
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
    selectBox,
    clearBox,
    clearAllAnswers,
    cancelAdvance,
  } = core;

  const sizing: ProblemSizing = useMemo(() => {
    const [op1, op2] = question.operands;
    const columns = Math.max(
      digitCount(op1),
      digitCount(op2),
      shape.integerBoxes,
    );
    const available = Math.max(280, windowWidth - 32);
    return compactSizing(columns, available);
  }, [question.operands, shape.integerBoxes, windowWidth]);

  // Keep the active box on-screen, scrolling left as the kid auto-advances
  // through the columns (initial focus is the rightmost / units box). No-op
  // when the problem fits; RN clamps the target to the content bounds.
  const scrollToActive = useCallback(() => {
    const contentW = contentWidthRef.current;
    if (!activeBox || contentW <= 0) return;
    const cfr = activeColsFromRight(
      activeBox,
      shape,
      partialShape,
      multInfo?.op1Cols ?? 1,
    );
    const boxLeft = contentW - (cfr + 1) * sizing.cellWidth;
    const x = Math.max(0, boxLeft - sizing.cellWidth * 1.5);
    problemScrollRef.current?.scrollTo({ x, animated: true });
  }, [activeBox, shape, partialShape, multInfo, sizing.cellWidth]);

  useEffect(() => {
    scrollToActive();
  }, [scrollToActive]);

  const answer = (
    <AnswerArea
      question={question}
      ink={answerInk}
      onClearBox={clearBox}
      selectedBox={activeBox}
      onSelectBox={selectBox}
      tone={tone}
      isBoxWritable={(boxId) => isBoxWritable(answerInk, shape, layout, boxId)}
      cellWidth={sizing.cellWidth}
      boxHeight={sizing.boxHeight}
      errorMarks={errorMarks}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.problemArea}>
        <ScrollView
          ref={problemScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.problemScroll}
          // Record the content width and position on the active box (the
          // rightmost / units column initially) once laid out, so wide
          // problems open at the right where the kid starts writing.
          onContentSizeChange={(w) => {
            contentWidthRef.current = w;
            scrollToActive();
          }}
        >
          <ProblemDisplay
            question={question}
            layout={layout}
            answerSlot={answer}
            borrowMarks={borrowMarks}
            onToggleBorrow={
              question.operation === 'subtraction' ? onToggleBorrow : undefined
            }
            carryInk={
              question.operation === 'addition' ||
              question.operation === 'multiplication'
                ? (carryInk ?? [])
                : undefined
            }
            partialInk={partialShape ? (partialInk ?? []) : undefined}
            timesCarryInk={
              partialShape ? (timesCarryInk?.[currentPartialRow] ?? []) : undefined
            }
            currentPartialRow={currentPartialRow}
            selectedBox={activeBox}
            onSelectBox={selectBox}
            onClearBox={clearBox}
            tone={tone}
            sizing={sizing}
            errorMarks={errorMarks}
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
                latestDivisionCarryRef.current,
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
          <ScratchToolbar
            onClear={() => scratchRef.current?.clear()}
            onUndo={() => scratchRef.current?.undo()}
          />
          <TipBubble
            id="tap-answer-box"
            when={frontierBox(answerInk, shape, layout) !== null}
            text={t('practice.tips.tapAnswerBox')}
            pointer="up"
            style={styles.bottomTip}
          />
          <ScratchCanvas
            ref={scratchRef}
            tool="pen"
            initialStrokes={scratchInk}
            onStrokesChange={onScratchInkChange}
            accessibilityLabel={t('a11y.scratchCanvas')}
          />
        </View>
      )}
    </View>
  );
}

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
    paddingTop: spacing.lg,
  },
  bottomRegion: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bottomTip: { marginBottom: spacing.sm },
});
