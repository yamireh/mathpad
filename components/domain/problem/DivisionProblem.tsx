/**
 * DivisionProblem — both division layouts in one place. `divisionLong` renders
 * the "bracket" staircase (pinned quotient + dividend, scrolling work area);
 * `divisionHorizontal` / `divisionDecimal` render the inline `a ÷ b =` row.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../constants/design';
import type { ReviewMarks } from '../../../lib/review';
import type { ProblemLayout, Question } from '../../../types';
import { BorrowArrow } from '../BorrowArrow';
import { computeBorrowDisplay } from '../borrow';
import { CarryBox } from '../CarryBox';
import { type InkStroke } from '../ink';
import {
  DIVISION_MINUS_WIDTH,
  PROBLEM_DIGIT_SIZE,
  type LongDivisionStepMinuend,
  digitCount,
} from '../layout';
import { DigitCells } from './shared';

export interface DivisionProblemProps {
  question: Question;
  /** The answer area (quotient boxes), positioned by the chosen layout. */
  answerSlot: ReactNode;
  /** Which division layout to render. */
  layout: ProblemLayout;
  /** Intermediate-work surface, placed inside the long-division bracket. */
  workSlot?: ReactNode;
  /** Long-division draft column width. */
  cellWidth: number;
  /** Paired digit font size for the long-division dividend. */
  digitSize: number;
  /** Currently pad-focused box id — drives the auto-scroll to the active cell. */
  selectedBox: string | null;
  /** Per quotient step, divisor columns (from left) that get a carry box. */
  divisionStepCarryCols?: number[][];
  /** Divisor-carry ink keyed `[step][col]`. */
  divisionCarryInk?: InkStroke[][][];
  /** Which quotient step the divisor-carry row binds to. */
  currentDivisionStep?: number;
  /** Focus the writing pad on a divisor-carry box id. */
  onSelectBox?: (boxId: string) => void;
  /** Clear a divisor-carry box by id. */
  onClearBox?: (boxId: string) => void;
  /** Accent colour for selection. */
  tone?: string;
  /** The dividend chunk as the active step-0 subtraction minuend (borrow). */
  dividendMinuend?: LongDivisionStepMinuend | null;
  /** Lender indices already tapped on the current step's minuend. */
  divisionBorrowLenders?: number[];
  /** Toggle a borrow lender on the current step's minuend. */
  onDivisionBorrow?: (lenderIndex: number) => void;
  /** Review error-highlight marks keyed by box id (divisor-carry boxes). */
  errorMarks?: ReviewMarks | null;
}

/** Division layout dispatcher: long bracket vs inline row. */
export function DivisionProblem({
  question,
  answerSlot,
  layout,
  workSlot,
  cellWidth,
  digitSize,
  selectedBox,
  divisionStepCarryCols,
  divisionCarryInk,
  currentDivisionStep = 0,
  onSelectBox,
  onClearBox,
  tone = colors.text,
  dividendMinuend,
  divisionBorrowLenders,
  onDivisionBorrow,
  errorMarks,
}: DivisionProblemProps) {
  if (layout === 'divisionLong') {
    return (
      <LongDivision
        question={question}
        answerSlot={answerSlot}
        workSlot={workSlot}
        cellWidth={cellWidth}
        digitSize={digitSize}
        selectedBox={selectedBox}
        carryCols={divisionStepCarryCols?.[currentDivisionStep] ?? []}
        carryStep={currentDivisionStep}
        carryInk={divisionCarryInk}
        onSelectBox={onSelectBox}
        onClearBox={onClearBox}
        tone={tone}
        dividendMinuend={dividendMinuend ?? null}
        borrowLenders={divisionBorrowLenders ?? []}
        onBorrow={onDivisionBorrow}
        errorMarks={errorMarks}
      />
    );
  }
  return <HorizontalDivision question={question} answerSlot={answerSlot} />;
}

/**
 * The dividend rendered as a borrow-capable row for step 0: the chunk digits
 * (`minuend.cols`) are tap-to-borrow with cross-out + reduced-value
 * annotations and the `+10` arrow, exactly like the Subtraction feature.
 * Non-chunk dividend digits render plain.
 */
function DividendBorrowRow({
  value,
  cellWidth,
  digitSize,
  minuend,
  lenders,
  onBorrow,
  tone,
}: {
  value: number;
  cellWidth: number;
  digitSize: number;
  minuend: LongDivisionStepMinuend;
  lenders: number[];
  onBorrow?: (lenderIndex: number) => void;
  tone: string;
}) {
  const digits = String(Math.abs(value)).split('').map(Number);
  const display =
    lenders.length > 0 ? computeBorrowDisplay(minuend.digits, lenders) : null;
  const annotationSize = Math.max(12, Math.round(digitSize * 0.55));
  const prevCount = useRef(lenders.length);
  const [arrow, setArrow] = useState<{ column: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    if (lenders.length > prevCount.current) {
      const last = lenders[lenders.length - 1];
      if (last >= 0 && last < minuend.digits.length - 1) {
        setArrow({ column: last, key: Date.now() });
      }
    }
    prevCount.current = lenders.length;
  }, [lenders, minuend.digits.length]);

  return (
    <View style={styles.dividendBorrowRow}>
      {digits.map((digit, col) => {
        const mIdx = minuend.cols.indexOf(col);
        const disp = display && mIdx >= 0 ? display[mIdx] : null;
        const cell = (
          <View style={{ width: cellWidth, alignItems: 'center' }}>
            <View style={styles.dividendAnnotation}>
              {disp?.crossedOut ? (
                <Text
                  style={[
                    styles.dividendAnnotationText,
                    { color: tone, fontSize: annotationSize },
                  ]}
                >
                  {disp.value}
                </Text>
              ) : null}
            </View>
            <View style={styles.dividendDigitWrap}>
              <Text style={[styles.problemText, { fontSize: digitSize }]}>
                {digit}
              </Text>
              {disp?.crossedOut ? (
                <View style={[styles.dividendStrike, { backgroundColor: tone }]} />
              ) : null}
            </View>
          </View>
        );
        return mIdx >= 0 && onBorrow ? (
          <Pressable
            key={col}
            accessibilityRole="button"
            accessibilityLabel={`Borrow from ${digit}`}
            onPress={() => onBorrow(mIdx)}
          >
            {cell}
          </Pressable>
        ) : (
          <View key={col}>{cell}</View>
        );
      })}
      {arrow ? (
        <View pointerEvents="none" style={styles.dividendArrowAnchor}>
          <BorrowArrow
            key={arrow.key}
            column={arrow.column}
            cellCount={minuend.digits.length}
            cellWidth={cellWidth}
            tone={tone}
            onDone={() => setArrow(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Carry boxes above the divisor for one quotient step — a box at each divisor
 * column (from the left) where `quotientDigit × divisor` carries. Mirrors
 * multiplication's times-carry row; rebinds to the active step upstream.
 */
function DivisorCarryRow({
  divisorDigits,
  carryCols,
  step,
  ink,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  cellWidth,
  errorMarks,
}: {
  divisorDigits: number;
  carryCols: number[];
  step: number;
  ink?: InkStroke[][][];
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  onClearBox: (boxId: string) => void;
  tone: string;
  cellWidth: number;
  errorMarks?: ReviewMarks | null;
}) {
  const carrySet = new Set(carryCols);
  const boxWidth = Math.max(20, cellWidth - 20);
  const boxHeight = 28;
  return (
    <View style={[styles.divisorWrap, styles.divisorCarryRow]}>
      {Array.from({ length: divisorDigits }).map((_, col) => {
        const id = `dcarry-${step}-${col}`;
        return (
          <View key={col} style={{ width: cellWidth, alignItems: 'center' }}>
            {carrySet.has(col) ? (
              <CarryBox
                strokes={ink?.[step]?.[col] ?? []}
                selected={selectedBox === id}
                onSelect={() => onSelectBox(id)}
                onClear={() => onClearBox(id)}
                accessibilityLabel={`Divisor carry ${divisorDigits - 1 - col}`}
                tone={tone}
                width={boxWidth}
                height={boxHeight}
                clearAbove
                status={errorMarks?.get(id) ?? null}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function HorizontalDivision({
  question,
  answerSlot,
}: {
  question: Question;
  answerSlot: ReactNode;
}) {
  const [dividend, divisor] = question.operands;
  return (
    <View style={styles.horizontalWrap}>
      <View style={styles.horizontalRow}>
        <Text style={styles.problemText}>{dividend}</Text>
        <Text style={styles.problemText}>÷</Text>
        <Text style={styles.problemText}>{divisor}</Text>
        <Text style={styles.problemText}>=</Text>
      </View>
      <View style={styles.horizontalAnswer}>{answerSlot}</View>
    </View>
  );
}

/**
 * Y offset of draft row `row` inside the work scroll. Each step pair (prod
 * row R=2Q, diff row R=2Q+1) has a fixed vertical footprint derived from
 * the cell + clear-slot + subtraction-rule + inter-row gap. Computed in
 * close form so the auto-scroll-to-active-cell effect doesn't need to
 * measure every row at runtime.
 */
function draftRowYOffset(row: number): number {
  // clearSlot (20) + cell (40) = 60 for any row; prod rows add a 4pt
  // subtraction rule (margin 1 + height 2 + margin 1); grid gap is 2pt.
  let y = 0;
  for (let r = 0; r < row; r += 1) {
    const isProdRow = r % 2 === 0;
    y += isProdRow ? 64 : 60;
    y += 2; // grid gap
  }
  return y;
}

/**
 * Long-division ("bracket") layout — connected left rule + top overline, the
 * quotient above, divisor to the left, and a tall work surface below. The
 * quotient row and dividend row are sticky; only the draft work area below
 * scrolls vertically, so the kid never loses sight of the problem.
 */
function LongDivision({
  question,
  answerSlot,
  workSlot,
  cellWidth,
  digitSize,
  selectedBox,
  carryCols,
  carryStep,
  carryInk,
  onSelectBox,
  onClearBox,
  tone,
  dividendMinuend,
  borrowLenders,
  onBorrow,
  errorMarks,
}: {
  question: Question;
  answerSlot: ReactNode;
  workSlot?: ReactNode;
  cellWidth: number;
  digitSize: number;
  selectedBox?: string | null;
  carryCols: number[];
  carryStep: number;
  carryInk?: InkStroke[][][];
  onSelectBox?: (boxId: string) => void;
  onClearBox?: (boxId: string) => void;
  tone: string;
  dividendMinuend: LongDivisionStepMinuend | null;
  borrowLenders: number[];
  onBorrow?: (lenderIndex: number) => void;
  errorMarks?: ReviewMarks | null;
}) {
  const [dividend, divisor] = question.operands;
  const divisorDigits = digitCount(divisor);
  // Multi-digit divisors render as fixed-width digit cells (so the carry
  // boxes can sit above each digit) and grow a carry lane above the divisor.
  const showDivisorCarry =
    divisorDigits > 1 && !!onSelectBox && !!onClearBox;
  const vScrollRef = useRef<ScrollView>(null);
  const hScrollRef = useRef<ScrollView>(null);
  // Live scroll positions + viewport dimensions, updated via onScroll +
  // onLayout. Refs (not state) so we can read the latest without
  // re-rendering when the kid pans the draft.
  const scrollStateRef = useRef({ y: 0, x: 0, vh: 0, hw: 0 });
  // Remember the last focused draft cell so we can scroll the *delta*
  // between cells — one row-height down per new draft row, one cell-width
  // right per new step's column shift. Matches how the staircase visually
  // grows so the kid's eye follows naturally.
  const prevDraftCellRef = useRef<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (!selectedBox) {
      prevDraftCellRef.current = null;
      return;
    }
    const m = /^dd-(\d+)-(\d+)$/.exec(selectedBox);
    // Quotient / remainder / decimal cells live in the pinned header row,
    // not the draft grid — leave the scroll alone for them.
    if (!m) return;
    const row = Number(m[1]);
    const col = Number(m[2]);
    prevDraftCellRef.current = { row, col };
    // Scroll the active draft cell *into view* using the live viewport height
    // rather than always pinning it to the top. When the cell is below the
    // fold (the staircase growing down), bring its bottom up to the viewport
    // bottom so the row — e.g. the final answer row — is never left clipped;
    // when it's above, bring its top down. Cells already in view don't move.
    const headroom = 16;
    const rowTop = draftRowYOffset(row);
    const rowBottom = rowTop + (row % 2 === 0 ? 64 : 60);
    const { y: curY, vh } = scrollStateRef.current;
    let targetY = rowTop - headroom;
    if (vh > 0) {
      if (rowBottom + headroom > curY + vh) {
        targetY = rowBottom + headroom - vh;
      } else if (rowTop - headroom < curY) {
        targetY = rowTop - headroom;
      } else {
        targetY = curY;
      }
    }
    vScrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
    hScrollRef.current?.scrollTo({
      x: Math.max(0, col * cellWidth - headroom),
      animated: true,
    });
  }, [selectedBox, cellWidth]);

  return (
    <View style={styles.longContainer}>
      {/* Quotient row — pinned. The left cell sits directly above the
          divisor: a divisor-carry lane for multi-digit divisors, else a
          hidden spacer keeping the quotient aligned over the dividend. */}
      <View style={styles.longTopRow}>
        {showDivisorCarry ? (
          <DivisorCarryRow
            divisorDigits={divisorDigits}
            carryCols={carryCols}
            step={carryStep}
            ink={carryInk}
            selectedBox={selectedBox ?? null}
            onSelectBox={onSelectBox!}
            onClearBox={onClearBox!}
            tone={tone}
            cellWidth={cellWidth}
            errorMarks={errorMarks}
          />
        ) : divisorDigits > 1 ? (
          <View style={[styles.divisorWrap, styles.hidden]}>
            <DigitCells value={divisor} cellWidth={cellWidth} digitSize={digitSize} />
          </View>
        ) : (
          <Text
            style={[
              styles.problemText,
              styles.longDivisor,
              styles.hidden,
              { fontSize: digitSize },
            ]}
          >
            {divisor}
          </Text>
        )}
        <View style={styles.longQuotient}>{answerSlot}</View>
      </View>
      {/* Dividend row — pinned. Top + left borders form the bracket's "├" header.
          The divisor uses the header-specific padding so it drops level with the
          dividend digits even with the borrow headroom above them. */}
      <View style={styles.longHeaderRow}>
        {divisorDigits > 1 ? (
          <View style={[styles.divisorWrap, styles.divisorHeaderPadTop]}>
            <DigitCells value={divisor} cellWidth={cellWidth} digitSize={digitSize} />
          </View>
        ) : (
          <Text
            style={[
              styles.problemText,
              styles.longDivisorHeader,
              { fontSize: digitSize },
            ]}
          >
            {divisor}
          </Text>
        )}
        <View style={styles.longBracketHeader}>
          {dividendMinuend ? (
            <DividendBorrowRow
              value={dividend}
              cellWidth={cellWidth}
              digitSize={digitSize}
              minuend={dividendMinuend}
              lenders={borrowLenders}
              onBorrow={onBorrow}
              tone={tone}
            />
          ) : (
            <View style={styles.dividendPlainPad}>
              <DigitCells
                value={dividend}
                cellWidth={cellWidth}
                digitSize={digitSize}
              />
            </View>
          )}
        </View>
      </View>
      {/* Draft work area — vertical+horizontal scroll inside its own bracket
          body. The dividend above stays put even when this scrolls right,
          which is exactly what the kid needs while writing decimal
          expansions in the staircase. */}
      {workSlot ? (
        <View style={styles.longBodyRow}>
          {/* Spacer matching the divisor's width keeps the bracket aligned. */}
          {divisorDigits > 1 ? (
            <View style={[styles.divisorWrap, styles.divisorPadTop, styles.hidden]}>
              <DigitCells value={divisor} cellWidth={cellWidth} digitSize={digitSize} />
            </View>
          ) : (
            <Text
              style={[
                styles.problemText,
                styles.longDivisor,
                styles.hidden,
                { fontSize: digitSize },
              ]}
            >
              {divisor}
            </Text>
          )}
          <View style={styles.longBracketBody}>
            <ScrollView
              ref={vScrollRef}
              style={styles.longWorkScroll}
              contentContainerStyle={styles.longWork}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={64}
              onScroll={(e) => {
                scrollStateRef.current.y = e.nativeEvent.contentOffset.y;
              }}
              onLayout={(e) => {
                scrollStateRef.current.vh = e.nativeEvent.layout.height;
              }}
            >
              <ScrollView
                ref={hScrollRef}
                horizontal
                showsHorizontalScrollIndicator
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.longWorkHorizontal}
                scrollEventThrottle={64}
                onScroll={(e) => {
                  scrollStateRef.current.x = e.nativeEvent.contentOffset.x;
                }}
                onLayout={(e) => {
                  scrollStateRef.current.hw = e.nativeEvent.layout.width;
                }}
              >
                {workSlot}
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Reserved space between the dividend's vinculum (top line) and its digits, so
 * a borrowed digit's crossed-out reduced value has room above it without
 * cramping the line or shoving the digits down when it appears.
 */
const DIVIDEND_BORROW_HEADROOM = 20;

const styles = StyleSheet.create({
  problemText: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  // Dividend rendered as a borrow row (step 0): annotation slot above each
  // digit + the digit, with a relative anchor for the +10 arrow overlay.
  dividendBorrowRow: { flexDirection: 'row', position: 'relative' },
  // Fixed headroom reserved above every dividend digit so a borrow's
  // reduced-value number has room below the top line without shifting the
  // digits when it appears.
  dividendAnnotation: {
    height: DIVIDEND_BORROW_HEADROOM,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  // Same headroom for the plain (non-borrow-step) dividend, so the dividend
  // sits at the same height whichever renderer is used.
  dividendPlainPad: { paddingTop: DIVIDEND_BORROW_HEADROOM },
  dividendAnnotationText: {
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  dividendDigitWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  dividendStrike: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-12deg' }],
  },
  dividendArrowAnchor: { position: 'absolute', top: 0, left: 0 },
  horizontalWrap: { alignSelf: 'stretch' },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  horizontalAnswer: { alignSelf: 'stretch', marginTop: spacing.lg },
  // Fills the available vertical space inside the question workspace so
  // the bracket's inner ScrollView has bounded height to scroll within.
  // `minHeight: 0` is mandatory on every flex parent below; without it the
  // flex chain refuses to shrink below content size and the draft area
  // overflows instead of scrolling. `overflow: 'hidden'` keeps overflow
  // contained when the frame shrinks (e.g. after the kid finishes and the
  // scratch toolbar appears) so the draft never spills onto the writing
  // pad below.
  longContainer: {
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  longTopRow: { flexDirection: 'row', alignItems: 'flex-end' },
  hidden: { opacity: 0 },
  // Quotient padding mirrors the bracket interior: bracket has its
  // paddingLeft + 3pt left border + the minus-sign lane, so the quotient
  // cells sit exactly above their dividend columns.
  longQuotient: {
    flex: 1,
    paddingLeft: spacing.md + 3 + DIVISION_MINUS_WIDTH,
    paddingBottom: spacing.xs,
  },
  // Header (dividend) row — sizes to its content (one row of digit cells).
  // The bracket header carries both top + left borders, forming the "┌" of
  // the long-division mark.
  longHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  longBracketHeader: {
    flex: 1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.text,
    paddingLeft: spacing.md + DIVISION_MINUS_WIDTH,
    // `flex: 1` stretches the bracket header all the way to the right
    // edge of the workspace, so the top "vinculum" line runs across the
    // whole row past the dividend. The dividend digits themselves still
    // sit at the left thanks to DigitCells' natural row alignment.
    // `paddingBottom` drops the left vertical line a little past the
    // dividend for a clean "┌" anchor over the work area.
    paddingBottom: spacing.md,
  },
  longDivisor: { paddingRight: spacing.sm, paddingTop: spacing.xs },
  // Header variant: drops the single-digit divisor by the borrow headroom too,
  // so it stays level with the dividend digits below the top line.
  longDivisorHeader: {
    paddingRight: spacing.sm,
    paddingTop: spacing.xs + DIVIDEND_BORROW_HEADROOM,
  },
  // Cell-based divisor (multi-digit): same right gap as `longDivisor` so the
  // bracket/quotient/dividend stay aligned, applied around `DigitCells`.
  divisorWrap: { paddingRight: spacing.sm },
  // Drops the divisor digits to sit level with the bracketed dividend, the
  // same way `longDivisor`'s paddingTop does for the single-digit text path.
  divisorPadTop: { paddingTop: spacing.xs },
  // Header variant: adds the borrow headroom so the multi-digit divisor stays
  // level with the dividend digits below the top line.
  divisorHeaderPadTop: { paddingTop: spacing.xs + DIVIDEND_BORROW_HEADROOM },
  // The carry lane sits in the (bottom-aligned) quotient row, just above the
  // divisor digits.
  divisorCarryRow: { flexDirection: 'row', alignItems: 'flex-end' },
  // Body (draft) row — fills the rest of the column. No vertical bracket
  // line continues here — standard long-division notation marks only the
  // dividend with the bracket "┌" shape, and the work below sits in open
  // space. The same paddingLeft as the header keeps the draft cells
  // column-aligned with the dividend digits above.
  longBodyRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  longBracketBody: {
    flex: 1,
    minHeight: 0,
    // The minus-sign lane now lives inside the draft grid (a fixed lane
    // before every row), so the body padding only needs the bracket gap +
    // the "removed left border" 3pt; the grid's own lane restores the
    // DIVISION_MINUS_WIDTH offset that keeps cells under the dividend.
    paddingLeft: spacing.md + /* removed left border */ 3,
  },
  // The scroll surface for the draft work area — bounded by the body row's
  // height. `minHeight: 0` lets it collapse below content so vertical
  // scrolling actually engages.
  longWorkScroll: { flex: 1, minHeight: 0 },
  // Bottom slack so the last draft row clears the bracket's clipped (overflow:
  // hidden) edge instead of getting its bottom border shaved.
  longWork: { paddingTop: spacing.xs, paddingBottom: spacing.lg },
  // Inner contentContainer for the horizontal scroll inside the draft
  // area. Lets the staircase extension cells scroll independently — the
  // dividend up top doesn't move.
  longWorkHorizontal: { paddingRight: spacing.sm },
});
