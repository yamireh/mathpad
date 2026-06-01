/**
 * DivisionBody — the division practice layout. Both long-division (the
 * staircase work area inside the bracket) and inline / decimal-row
 * layouts share enough state that they live in one body; the inner
 * `isLongDivision` switch picks which `ProblemDisplay` configuration
 * to render. The writing pad routes to the active answer cell OR
 * to a long-division draft cell.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { spacing } from '../../../constants/design';
import { AnswerArea } from '../AnswerArea';
import { DivisionDraftGrid } from '../DivisionDraftGrid';
import { ProblemDisplay } from '../problem';
import {
  getBoxStrokes,
  isBoxWritable,
  setBoxStrokes,
} from '../ink';
import {
  digitCount,
  divisionDraftSize,
  divisionSizing,
  DIVISION_MINUS_WIDTH,
  DIVISION_QUOTIENT_HEIGHT,
} from '../layout';
import { lastDraftInkRow } from './draftInk';
import { fillSequence } from './fillSequence';
import { LayoutToggle } from './LayoutToggle';
import { nextEmptyBox } from './nextEmptyBox';
import { PadRegion } from './PadRegion';
import type { WorkspaceCore } from './types';

/** Idle time after the last stroke before auto-advancing to the next box. */
const ADVANCE_DELAY_MS = 300;

export interface DivisionBodyProps {
  core: WorkspaceCore;
}

export function DivisionBody({ core }: DivisionBodyProps) {
  useTranslation(); // keep i18n bootstrap consistent across bodies
  const { width: windowWidth } = useWindowDimensions();
  const {
    question,
    layout,
    tone,
    answerInk,
    onAnswerInkChange,
    onUndo,
    canUndo,
    onLayoutChange,
    divisionDraftInk,
    onDivisionDraftInkChange,
    divisionCarryInk,
    onDivisionCarryInkChange,
    divisionBorrowMarks,
    onToggleDivisionBorrow,
    shape,
    expectedCarries,
    multInfo,
    divisionStepCarryCols,
    divisionStepMinuends,
    lockedDraftRows,
    draftLabels,
    currentDivisionStep,
    isLongDivision,
    inlineLayout,
    activeBox,
    activeDivisionDraft,
    activeDivisionCarry,
    padCollapsed,
    padNonce,
    bringDownPulse,
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

  // --- Visible draft rows + cell sizing for the long-division grid ---
  const draftSize = divisionDraftSize(question.operands[0]);
  // Visible draft rows grow with the kid's work — keep one empty row
  // below the last row with ink, capped at 2 × totalQuotientDigits.
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
    divisorCarryCols: divisionStepCarryCols,
  };

  // Pick the largest cell width that lets the FULL staircase fit on
  // screen. Chrome budget: ScrollView padding + divisor + bracket + minus.
  // A multi-digit divisor now renders as cell-width digits (to seat the
  // carry lane), so its digits are counted among the cells and only its
  // small right gap stays in `chrome`; a single-digit divisor still renders
  // as tight text and keeps its flat reservation.
  const divisorDigits = digitCount(question.operands[1]);
  const multiDigitDivisor = divisorDigits > 1;
  // Size cells for the INTEGER staircase only. A decimal answer's expansion
  // extends rightward and rides the horizontal scroll, so decimal questions
  // get the same box size as integer/remainder ones instead of shrinking to
  // fit 3 extra decimal columns.
  const widestRowCells =
    Math.max(draftSize.columns, shape.integerBoxes + draftSize.columns) +
    (multiDigitDivisor ? divisorDigits : 0);
  const divisorChrome = multiDigitDivisor ? 8 : 50;
  const chrome = 32 + divisorChrome + 3 + 12 + DIVISION_MINUS_WIDTH + 8;
  const availableForCells = Math.max(180, windowWidth - chrome);
  const { cellWidth: dCellWidth, digitSize: dDigitSize } = divisionSizing(
    widestRowCells,
    availableForCells,
  );

  // The active step's subtraction minuend: borrowable on the dividend (step 0,
  // rendered in the header) or on a locked difference row (later steps).
  const currentMinuend = divisionStepMinuends[currentDivisionStep] ?? null;
  const draftMinuend =
    currentMinuend && !currentMinuend.inDividend ? currentMinuend : null;
  const dividendMinuend =
    currentMinuend && currentMinuend.inDividend ? currentMinuend : null;
  const stepLenders = divisionBorrowMarks?.[currentDivisionStep] ?? [];
  const onBorrowCurrentStep = (lenderIndex: number) =>
    onToggleDivisionBorrow?.(currentDivisionStep, lenderIndex);

  const answerArea = (
    <View>
      <AnswerArea
        question={question}
        ink={answerInk}
        onClearBox={clearBox}
        selectedBox={activeBox}
        onSelectBox={selectBox}
        tone={tone}
        isBoxWritable={(boxId) => isBoxWritable(answerInk, shape, layout, boxId)}
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
        lockedDraftRows={lockedDraftRows}
        draftLabels={draftLabels}
        activeMinuend={draftMinuend}
        borrowLenders={stepLenders}
        onBorrow={onBorrowCurrentStep}
      />
    ) : null;

  return (
    <View style={styles.container}>
      {onLayoutChange ? (
        <LayoutToggle
          isLongDivision={isLongDivision}
          tone={tone}
          onChange={onLayoutChange}
          inlineLayout={inlineLayout}
        />
      ) : null}

      {isLongDivision ? (
        <View style={[styles.longArea, styles.longBody]}>
          <ProblemDisplay
            question={question}
            layout={layout}
            answerSlot={answerArea}
            workSlot={draftGrid}
            divisionCellWidth={dCellWidth}
            divisionDigitSize={dDigitSize}
            selectedBox={activeBox}
            divisionStepCarryCols={divisionStepCarryCols}
            divisionCarryInk={divisionCarryInk}
            currentDivisionStep={currentDivisionStep}
            dividendMinuend={dividendMinuend}
            divisionBorrowLenders={stepLenders}
            onDivisionBorrow={onBorrowCurrentStep}
            onSelectBox={selectBox}
            onClearBox={clearBox}
            tone={tone}
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

      {/* In long division the kid's working area IS the draft staircase
          — no scratch needed below. When the pad closes, leave the
          bottom empty so the bracket doesn't reflow. */}
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
              : activeDivisionCarry
                ? (divisionCarryInk?.[activeDivisionCarry.row]?.[
                    activeDivisionCarry.col
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
            } else if (activeDivisionCarry) {
              onDivisionCarryInkChange?.(
                activeDivisionCarry.row,
                activeDivisionCarry.col,
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
                latestDivisionCarryRef.current,
              );
              setActiveBox(next);
            }, ADVANCE_DELAY_MS);
          }}
          onClearAll={clearAllAnswers}
          onUndo={onUndo}
          canUndo={canUndo}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  longBody: { padding: spacing.lg },
  // The long-division frame sits a bit taller than the writing pad below
  // so the staircase has headroom to grow. The ratio also trims the pad a
  // touch (vs the inline layout) — bump it to shrink the pad further.
  longArea: { flex: 1.42, overflow: 'hidden' },
  divisionInline: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
});
