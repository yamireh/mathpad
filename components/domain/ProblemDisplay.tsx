import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TipBubble } from '../ui';
import { colors, radius, spacing, typography } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
import { BorrowArrow } from './BorrowArrow';
import { computeBorrowDisplay, needsBorrow } from './borrow';
import { CarryBox } from './CarryBox';
import { type InkStroke } from './ink';
import {
  type ProblemSizing,
  DIGIT_COLUMN_WIDTH,
  DIVISION_DIGIT_SIZE,
  DIVISION_DRAFT_CELL_WIDTH,
  DIVISION_MINUS_WIDTH,
  OPERATOR_COLUMN_WIDTH,
  PROBLEM_DIGIT_SIZE,
  answerShape,
  digitCount,
  operatorSymbol,
  partialWidths,
  regularSizing,
} from './layout';
import { AnswerBox } from './AnswerBox';

export interface ProblemDisplayProps {
  question: Question;
  /** The answer area (handwriting boxes), positioned by the chosen layout. */
  answerSlot: ReactNode;
  /** Overrides the question's own layout (e.g. a user layout toggle). */
  layout?: ProblemLayout;
  /** Intermediate-work surface, placed inside the long-division bracket. */
  workSlot?: ReactNode;
  /** Tapped borrow-lender columns (top-operand digit indices). */
  borrowMarks?: number[];
  /** Toggle a borrow on a top-operand digit; presence enables tap-to-borrow. */
  onToggleBorrow?: (column: number) => void;
  /** Per-column carry ink (addition / multiplication); enables the carry row. */
  carryInk?: InkStroke[][];
  /**
   * Per-row, per-column partial-product ink (multiplication with multi-digit
   * multiplier only). Each entry is the strokes for one partial-product cell.
   */
  partialInk?: InkStroke[][][];
  /**
   * Times-step carry ink for the currently active partial — single row,
   * indexed by op1 column-from-left. Rendered above op1 for multi-digit ×.
   */
  timesCarryInk?: InkStroke[][];
  /** Which partial-row the visible times-carry slot binds to (× only). */
  currentPartialRow?: number;
  /** Currently pad-focused box id (shared with the answer area). */
  selectedBox?: string | null;
  /** Focus the writing pad on a box id (carry boxes). */
  onSelectBox?: (boxId: string) => void;
  /** Clear a box by id (carry boxes). */
  onClearBox?: (boxId: string) => void;
  /** Accent colour for borrow marks and selection. */
  tone?: string;
  /** Column / box / digit sizing. Defaults to the full grid. */
  sizing?: ProblemSizing;
  /**
   * Per-question override for the long-division grid's column width.
   * Defaults to {@link DIVISION_DRAFT_CELL_WIDTH}. Set this when the
   * staircase needs to shrink to keep the dividend on screen without
   * horizontal scrolling.
   */
  divisionCellWidth?: number;
  /** Paired digit font size for the long-division dividend. */
  divisionDigitSize?: number;
}

/** Renders a math problem and places its answer area, per question layout. */
export function ProblemDisplay({
  question,
  answerSlot,
  layout,
  workSlot,
  borrowMarks,
  onToggleBorrow,
  carryInk,
  partialInk,
  timesCarryInk,
  currentPartialRow = 0,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone = colors.text,
  sizing,
  divisionCellWidth,
  divisionDigitSize,
}: ProblemDisplayProps) {
  const resolvedSizing = sizing ?? regularSizing();
  const effective = layout ?? question.layout;
  switch (effective) {
    case 'vertical':
      return (
        <VerticalProblem
          question={question}
          answerSlot={answerSlot}
          borrowMarks={borrowMarks ?? []}
          onToggleBorrow={onToggleBorrow}
          carryInk={carryInk}
          partialInk={partialInk}
          timesCarryInk={timesCarryInk}
          currentPartialRow={currentPartialRow}
          selectedBox={selectedBox ?? null}
          onSelectBox={onSelectBox}
          onClearBox={onClearBox}
          tone={tone}
          sizing={resolvedSizing}
        />
      );
    case 'divisionLong':
      return (
        <LongDivisionProblem
          question={question}
          answerSlot={answerSlot}
          workSlot={workSlot}
          cellWidth={divisionCellWidth ?? DIVISION_DRAFT_CELL_WIDTH}
          digitSize={divisionDigitSize ?? DIVISION_DIGIT_SIZE}
          selectedBox={selectedBox ?? null}
        />
      );
    case 'divisionHorizontal':
    case 'divisionDecimal':
      return (
        <HorizontalDivisionProblem
          question={question}
          answerSlot={answerSlot}
        />
      );
  }
}

/** A number rendered as right-aligned, fixed-width digit cells. */
function DigitCells({
  value,
  cellWidth,
  digitSize,
}: {
  value: number;
  cellWidth: number;
  digitSize: number;
}) {
  const digits = String(Math.abs(value)).split('');
  return (
    <View style={styles.digitRow}>
      {digits.map((digit, i) => (
        <View
          key={i}
          style={{ width: cellWidth, alignItems: 'center' }}
        >
          <Text style={[styles.digit, { fontSize: digitSize }]}>{digit}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * One partial-product row for multi-digit multiplication, right-aligned with
 * the column grid and shifted left by `rowIndex` columns. Cells write through
 * the same answer pad as the sum row.
 */
function PartialProductRow({
  rowIndex,
  width,
  columns,
  strokes,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  cellWidth,
  boxHeight,
  digitSize,
}: {
  rowIndex: number;
  width: number;
  columns: number;
  strokes: InkStroke[][];
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  onClearBox: (boxId: string) => void;
  tone: string;
  cellWidth: number;
  boxHeight: number;
  digitSize: number;
}) {
  // Total `columns` cells: leading empties on the left, `width` digit cells,
  // then `rowIndex` placeholder-zero cells on the right (the partial-product
  // shift — taught as visible 0s to keep place-value explicit).
  const leading = Math.max(0, columns - width - rowIndex);
  const trailing = Math.max(0, columns - leading - width);
  return (
    <View style={styles.partialRow}>
      {Array.from({ length: leading }).map((_, i) => (
        <View
          key={`pad-l-${i}`}
          style={{ width: cellWidth, height: boxHeight }}
        />
      ))}
      {Array.from({ length: width }).map((_, c) => {
        const id = `pp-${rowIndex}-${c}`;
        return (
          <AnswerBox
            key={id}
            accessibilityLabel={`Partial ${rowIndex + 1} digit ${width - c}`}
            tone={tone}
            selected={selectedBox === id}
            onSelect={() => onSelectBox(id)}
            strokes={strokes[c] ?? []}
            onClear={() => onClearBox(id)}
            cellWidth={cellWidth}
            boxHeight={boxHeight}
          />
        );
      })}
      {Array.from({ length: trailing }).map((_, i) => (
        <PartialZeroCell
          key={`zero-${i}`}
          columnWidth={cellWidth}
          boxHeight={boxHeight}
          digitSize={digitSize}
        />
      ))}
    </View>
  );
}

/**
 * A non-interactive placeholder cell printing "0" in a dimmed answer-box
 * shell. Used for the trailing shift columns of partial-product rows so
 * the kid sees the conventional place-value zeros.
 */
function PartialZeroCell({
  columnWidth,
  boxHeight,
  digitSize,
}: {
  columnWidth: number;
  boxHeight: number;
  digitSize: number;
}) {
  return (
    <View style={{ width: columnWidth, alignItems: 'center' }}>
      <View style={styles.zeroClearSlot} />
      <View
        style={[
          styles.zeroBox,
          { width: columnWidth - 12, height: boxHeight },
        ]}
      >
        <Text style={[styles.zeroDigit, { fontSize: digitSize }]}>0</Text>
      </View>
    </View>
  );
}

/**
 * Times-step carry row for multi-digit multiplication. Sits above op1 and
 * is bound to the currently active partial — its ink and writes target
 * `timesCarryInk[currentPartialRow][op1Col]` upstream. Carry slots exist
 * for every op1 column except the units (which has nothing to carry into).
 */
function TimesCarryRow({
  columns,
  op1Cols,
  partialRow,
  ink,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  cellWidth,
  operatorWidth,
  boxWidth,
  boxHeight,
}: {
  columns: number;
  op1Cols: number;
  partialRow: number;
  ink: InkStroke[][];
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  onClearBox: (boxId: string) => void;
  tone: string;
  cellWidth: number;
  operatorWidth: number;
  boxWidth: number;
  boxHeight: number;
}) {
  const offsetCols = columns - op1Cols;
  return (
    <View style={[styles.carryRow, { marginLeft: operatorWidth }]}>
      {Array.from({ length: columns }).map((_, overallCol) => {
        const op1Col = overallCol - offsetCols;
        const hasBox = op1Col >= 0 && op1Col < op1Cols - 1;
        const id = `tcarry-${partialRow}-${op1Col}`;
        return (
          <View
            key={overallCol}
            style={{ width: cellWidth, alignItems: 'center' }}
          >
            {hasBox ? (
              <CarryBox
                strokes={ink[op1Col] ?? []}
                selected={selectedBox === id}
                onSelect={() => onSelectBox(id)}
                onClear={() => onClearBox(id)}
                accessibilityLabel={`Times carry ${op1Cols - 1 - op1Col}`}
                tone={tone}
                width={boxWidth}
                height={boxHeight}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * A row of small tap-to-write carry boxes, one above each column but the units.
 * Tapping a box focuses the writing pad on it, exactly like an answer box.
 */
function CarryRow({
  columns,
  carryInk,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  cellWidth,
  operatorWidth,
  boxWidth,
  boxHeight,
}: {
  columns: number;
  carryInk: InkStroke[][];
  selectedBox: string | null;
  onSelectBox: (boxId: string) => void;
  onClearBox: (boxId: string) => void;
  tone: string;
  cellWidth: number;
  operatorWidth: number;
  boxWidth: number;
  boxHeight: number;
}) {
  return (
    <View style={[styles.carryRow, { marginLeft: operatorWidth }]}>
      {Array.from({ length: columns }).map((_, i) => {
        const id = `carry-${i}`;
        return (
          <View
            key={i}
            style={{ width: cellWidth, alignItems: 'center' }}
          >
            {i < columns - 1 ? (
              <CarryBox
                strokes={carryInk[i] ?? []}
                selected={selectedBox === id}
                onSelect={() => onSelectBox(id)}
                onClear={() => onClearBox(id)}
                accessibilityLabel={`Carry box ${columns - 1 - i}`}
                tone={tone}
                width={boxWidth}
                height={boxHeight}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The top operand of a subtraction — each digit tappable to borrow from it.
 * A borrowed digit is crossed out with its adjusted value shown above.
 */
function BorrowDigitRow({
  value,
  marks,
  onToggle,
  tone,
  cellWidth,
  digitSize,
}: {
  value: number;
  marks: number[];
  onToggle: (column: number) => void;
  tone: string;
  cellWidth: number;
  digitSize: number;
}) {
  const digits = String(Math.abs(value)).split('').map(Number);
  const display = computeBorrowDisplay(digits, marks);

  // The borrow arrow plays EVERY time the kid taps a digit to borrow —
  // it's a teaching aid, not a one-time tip. (Previously it was gated by
  // `useTip('borrow-arrow')` which dismissed itself after the first
  // borrow, hiding the animation for the rest of the session.)
  const prevCount = useRef(marks.length);
  const [arrow, setArrow] = useState<{ column: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    if (marks.length > prevCount.current) {
      const lastColumn = marks[marks.length - 1];
      if (lastColumn >= 0 && lastColumn < digits.length - 1) {
        setArrow({ column: lastColumn, key: Date.now() });
      }
    }
    prevCount.current = marks.length;
  }, [marks, digits.length]);

  // Borrow annotation font scales with the digit so the small "crossed-out"
  // value above the digit stays visually proportionate.
  const annotationSize = Math.max(12, Math.round(digitSize * 0.55));

  return (
    <View style={[styles.digitRow, styles.borrowRowAnchor]}>
      {digits.map((digit, i) => {
        const { value: shown, crossedOut } = display[i];
        const tappable = i < digits.length - 1;
        const inner = (
          <View style={[styles.cell, { width: cellWidth }]}>
            <View style={styles.annotationSlot}>
              {crossedOut ? (
                <Text
                  style={[
                    styles.annotation,
                    { color: tone, fontSize: annotationSize },
                  ]}
                >
                  {shown}
                </Text>
              ) : null}
            </View>
            <View style={styles.digitWrap}>
              <Text style={[styles.digit, { fontSize: digitSize }]}>
                {digit}
              </Text>
              {crossedOut ? (
                <View style={[styles.strike, { backgroundColor: tone }]} />
              ) : null}
            </View>
          </View>
        );
        return tappable ? (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Borrow from ${digit}`}
            onPress={() => onToggle(i)}
          >
            {inner}
          </Pressable>
        ) : (
          <View key={i}>{inner}</View>
        );
      })}
      {arrow ? (
        <BorrowArrow
          key={arrow.key}
          column={arrow.column}
          cellCount={digits.length}
          cellWidth={cellWidth}
          tone={tone}
          onDone={() => setArrow(null)}
        />
      ) : null}
    </View>
  );
}

function VerticalProblem({
  question,
  answerSlot,
  borrowMarks,
  onToggleBorrow,
  carryInk,
  partialInk,
  timesCarryInk,
  currentPartialRow,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  sizing,
}: {
  question: Question;
  answerSlot: ReactNode;
  borrowMarks: number[];
  onToggleBorrow?: (column: number) => void;
  carryInk?: InkStroke[][];
  partialInk?: InkStroke[][][];
  timesCarryInk?: InkStroke[][];
  currentPartialRow: number;
  selectedBox: string | null;
  onSelectBox?: (boxId: string) => void;
  onClearBox?: (boxId: string) => void;
  tone: string;
  sizing: ProblemSizing;
}) {
  const { t } = useTranslation();
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const answerColumns = shape.integerBoxes + (shape.hasSign ? 1 : 0);
  const columns = Math.max(digitCount(op1), digitCount(op2), answerColumns);
  // All children measure off these — operand digits, answer boxes, carries,
  // partial-product rows — so everything aligns on the same column grid.
  const {
    cellWidth,
    boxHeight,
    digitSize,
    operatorWidth,
    carryWidth: carryW,
    carryHeight: carryH,
  } = sizing;
  const columnAreaWidth = columns * cellWidth;
  const showBorrowTip =
    !!onToggleBorrow && borrowMarks.length === 0 && needsBorrow(op1, op2);
  // Multi-digit multipliers render their partial products as separate rows
  // between the two rules. The sum carry row then sits above the sum.
  const isMultiplication = question.operation === 'multiplication';
  const partials = isMultiplication ? partialWidths(op1, op2) : null;
  const carryAboveOps = !!carryInk && !isMultiplication;
  const carryAboveSum = !!carryInk && isMultiplication;

  return (
    <View>
      {carryAboveOps && onSelectBox && onClearBox ? (
        <CarryRow
          columns={columns}
          carryInk={carryInk}
          selectedBox={selectedBox}
          onSelectBox={onSelectBox}
          onClearBox={onClearBox}
          tone={tone}
          cellWidth={cellWidth}
          operatorWidth={operatorWidth}
          boxWidth={carryW}
          boxHeight={carryH}
        />
      ) : null}

      {partials && timesCarryInk && onSelectBox && onClearBox ? (
        <TimesCarryRow
          columns={columns}
          op1Cols={digitCount(op1)}
          partialRow={currentPartialRow}
          ink={timesCarryInk}
          selectedBox={selectedBox}
          onSelectBox={onSelectBox}
          onClearBox={onClearBox}
          tone={tone}
          cellWidth={cellWidth}
          operatorWidth={operatorWidth}
          boxWidth={carryW}
          boxHeight={carryH}
        />
      ) : null}

      <TipBubble
        id="tap-to-borrow"
        when={showBorrowTip}
        text={t('practice.tips.tapToBorrow')}
        pointer="down"
        style={styles.borrowTip}
      />

      <View style={styles.problemRow}>
        <View style={[styles.operatorColumn, { width: operatorWidth }]} />
        <View style={[styles.columnArea, { width: columnAreaWidth }]}>
          {onToggleBorrow ? (
            <BorrowDigitRow
              value={op1}
              marks={borrowMarks}
              onToggle={onToggleBorrow}
              tone={tone}
              cellWidth={cellWidth}
              digitSize={digitSize}
            />
          ) : (
            <DigitCells value={op1} cellWidth={cellWidth} digitSize={digitSize} />
          )}
        </View>
      </View>
      <View style={styles.problemRow}>
        <View style={[styles.operatorColumn, { width: operatorWidth }]}>
          <Text style={[styles.operator, { fontSize: digitSize }]}>
            {operatorSymbol[question.operation]}
          </Text>
        </View>
        <View style={[styles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells value={op2} cellWidth={cellWidth} digitSize={digitSize} />
        </View>
      </View>
      <View
        style={[
          styles.rule,
          { width: columnAreaWidth, marginLeft: operatorWidth },
          // Multiplication has two rules — give the first one less breathing
          // room so the second (above the final sum) can have more.
          partials ? { marginVertical: 1 } : null,
        ]}
      />

      {partials && onSelectBox && onClearBox ? (
        <View style={{ marginLeft: operatorWidth }}>
          {partials.map((width, rowIdx) => (
            <PartialProductRow
              key={rowIdx}
              rowIndex={rowIdx}
              width={width}
              columns={columns}
              strokes={partialInk?.[rowIdx] ?? []}
              selectedBox={selectedBox}
              onSelectBox={onSelectBox}
              onClearBox={onClearBox}
              tone={tone}
              cellWidth={cellWidth}
              boxHeight={boxHeight}
              digitSize={digitSize}
            />
          ))}
          <View
            style={[
              styles.rule,
              { width: columnAreaWidth, marginVertical: 5 },
            ]}
          />
        </View>
      ) : null}

      {carryAboveSum && onSelectBox && onClearBox ? (
        <CarryRow
          columns={columns}
          carryInk={carryInk}
          selectedBox={selectedBox}
          onSelectBox={onSelectBox}
          onClearBox={onClearBox}
          tone={tone}
          cellWidth={cellWidth}
          operatorWidth={operatorWidth}
          boxWidth={carryW}
          boxHeight={carryH}
        />
      ) : null}

      <View
        style={[
          styles.answerArea,
          { width: columnAreaWidth, marginLeft: operatorWidth },
        ]}
      >
        {answerSlot}
      </View>
    </View>
  );
}

function HorizontalDivisionProblem({
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
 * Long-division ("bracket") layout — connected left rule + top overline, the
 * quotient above, divisor to the left, and a tall work surface below. The
 * quotient row and dividend row are sticky; only the draft work area below
 * scrolls vertically, so the kid never loses sight of the problem.
 */
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

function LongDivisionProblem({
  question,
  answerSlot,
  workSlot,
  cellWidth,
  digitSize,
  selectedBox,
}: {
  question: Question;
  answerSlot: ReactNode;
  workSlot?: ReactNode;
  cellWidth: number;
  digitSize: number;
  selectedBox?: string | null;
}) {
  const [dividend, divisor] = question.operands;
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
    // Always anchor the active draft cell near the top-left of the
    // viewport (with a small lead-in so the kid sees a bit of context
    // above/left). RN clamps automatically when there's no more room to
    // scroll, and scrollTo is a no-op when the target equals the current
    // offset, so cells in the same row/step don't jitter.
    const headroom = 16;
    vScrollRef.current?.scrollTo({
      y: Math.max(0, draftRowYOffset(row) - headroom),
      animated: true,
    });
    hScrollRef.current?.scrollTo({
      x: Math.max(0, col * cellWidth - headroom),
      animated: true,
    });
  }, [selectedBox, cellWidth]);

  return (
    <View style={styles.longContainer}>
      {/* Quotient row — pinned. */}
      <View style={styles.longTopRow}>
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
        <View style={styles.longQuotient}>{answerSlot}</View>
      </View>
      {/* Dividend row — pinned. Top + left borders form the bracket's "├" header. */}
      <View style={styles.longHeaderRow}>
        <Text
          style={[
            styles.problemText,
            styles.longDivisor,
            { fontSize: digitSize },
          ]}
        >
          {divisor}
        </Text>
        <View style={styles.longBracketHeader}>
          <DigitCells
            value={dividend}
            cellWidth={cellWidth}
            digitSize={digitSize}
          />
        </View>
      </View>
      {/* Draft work area — vertical+horizontal scroll inside its own bracket
          body. The dividend above stays put even when this scrolls right,
          which is exactly what the kid needs while writing decimal
          expansions in the staircase. */}
      {workSlot ? (
        <View style={styles.longBodyRow}>
          {/* Spacer matching the divisor's width keeps the bracket aligned. */}
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

const styles = StyleSheet.create({
  problemRow: { flexDirection: 'row', alignItems: 'flex-end' },
  operatorColumn: {
    width: OPERATOR_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xs,
  },
  operator: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
  },
  columnArea: { flexDirection: 'row', justifyContent: 'flex-end' },
  digitRow: { flexDirection: 'row' },
  borrowRowAnchor: { position: 'relative', overflow: 'visible' },
  cell: { width: DIGIT_COLUMN_WIDTH, alignItems: 'center' },
  digit: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  /* Carry boxes */
  carryRow: { flexDirection: 'row', marginBottom: 2 },
  /* Borrow annotations */
  annotationSlot: {
    height: 28,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  annotation: {
    fontSize: 20,
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  digitWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  strike: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-12deg' }],
  },
  borrowTip: { marginBottom: spacing.xs },
  partialRow: { flexDirection: 'row', marginTop: 2 },
  zeroClearSlot: { height: 14 },
  zeroBox: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    opacity: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroDigit: {
    color: colors.text,
    fontWeight: typography.weight.regular,
    fontVariant: ['tabular-nums'],
  },
  rule: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.text,
    marginVertical: 2,
  },
  answerArea: { flexDirection: 'row', justifyContent: 'flex-end' },
  horizontalWrap: { alignSelf: 'stretch' },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  horizontalAnswer: { alignSelf: 'stretch', marginTop: spacing.lg },
  problemText: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
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
  longDivisor: { paddingRight: spacing.sm, paddingTop: spacing.md },
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
    paddingLeft: spacing.md + DIVISION_MINUS_WIDTH + /* removed left border */ 3,
  },
  longDividend: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  // The scroll surface for the draft work area — bounded by the body row's
  // height. `minHeight: 0` lets it collapse below content so vertical
  // scrolling actually engages.
  longWorkScroll: { flex: 1, minHeight: 0 },
  longWork: { paddingTop: spacing.xs },
  // Inner contentContainer for the horizontal scroll inside the draft
  // area. Lets the staircase extension cells scroll independently — the
  // dividend up top doesn't move.
  longWorkHorizontal: { paddingRight: spacing.sm },
});
