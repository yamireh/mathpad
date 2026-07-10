/**
 * MultiplicationProblem — vertical multiplication. Single-digit multipliers
 * render like addition with a carry row above the product. Multi-digit
 * multipliers render a times-step carry row above op1, one partial-product
 * row per multiplier digit (each with a leading `+` lane and place-value
 * zeros), a rule, then the carry row + final sum.
 */
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../constants/design';
import type { ReviewMarks } from '../../../lib/review';
import type { Question } from '../../../types';
import { AnswerBox } from '../AnswerBox';
import { CarryBox } from '../CarryBox';
import { type InkStroke } from '../ink';
import {
  type ProblemSizing,
  digitCount,
  multiplicationDigitOperands,
  operatorSymbol,
  partialWidths,
} from '../layout';
import { CarryRow, DigitCells, ThinDotDigits, sharedStyles } from './shared';

export interface MultiplicationProblemProps {
  question: Question;
  /** The answer area (handwriting boxes) for the product. */
  answerSlot: ReactNode;
  /** Per-column carry ink for the final sum; presence enables the carry row. */
  carryInk?: InkStroke[][];
  /** Per-row, per-column partial-product ink (multi-digit multiplier only). */
  partialInk?: InkStroke[][][];
  /** Times-step carry ink for the currently active partial (single row). */
  timesCarryInk?: InkStroke[][];
  /** Which partial-row the visible times-carry slot binds to. */
  currentPartialRow: number;
  /** Currently pad-focused box id (shared with the answer area). */
  selectedBox: string | null;
  /** Focus the writing pad on a carry / partial / times-carry box id. */
  onSelectBox?: (boxId: string) => void;
  /** Clear a box by id. */
  onClearBox?: (boxId: string) => void;
  /** Accent colour for selection. */
  tone: string;
  /** Column / box / digit sizing. */
  sizing: ProblemSizing;
  /** Review error-highlight marks keyed by box id. */
  errorMarks?: ReviewMarks | null;
}

/** Vertical multiplication layout. */
export function MultiplicationProblem({
  question,
  answerSlot,
  carryInk,
  partialInk,
  timesCarryInk,
  currentPartialRow,
  selectedBox,
  onSelectBox,
  onClearBox,
  tone,
  sizing,
  errorMarks,
}: MultiplicationProblemProps) {
  const [op1, op2] = question.operands;
  const [p1, p2] = question.operandDecimals ?? [0, 0];
  // Decimal × multiplies the operand DIGIT STRINGS as integers (the point is
  // placed in the product). So the column grid is integer (the product's digit
  // width); operands render their digit strings with a thin decimal-point mark.
  const [a1, a2] = multiplicationDigitOperands(question);
  const columns = Math.max(digitCount(a1), digitCount(a2), digitCount(a1 * a2));
  const {
    cellWidth,
    boxHeight,
    digitSize,
    operatorWidth,
    carryWidth: carryW,
    carryHeight: carryH,
  } = sizing;
  const columnAreaWidth = columns * cellWidth;
  // Multi-digit multipliers render their partial products as separate rows
  // between the two rules. The sum carry row then sits above the sum.
  const partials = partialWidths(a1, a2);
  // No carry box over the leftmost (last) answer digit — it's the final digit,
  // written straight into the answer. Skip at least that column, plus any
  // leading columns no partial product reaches (each partial spans width + its
  // row shift). Internal carry boxes stay.
  const sumCarryLeadingSkip = Math.max(
    1,
    partials ? columns - Math.max(...partials.map((w, r) => w + r)) : 0,
  );
  const operand = (value: number, places: number) =>
    places > 0 ? (
      <ThinDotDigits
        value={value}
        places={places}
        cellWidth={cellWidth}
        digitSize={digitSize}
      />
    ) : (
      <DigitCells value={value} cellWidth={cellWidth} digitSize={digitSize} />
    );

  return (
    <View>
      {partials && timesCarryInk && onSelectBox && onClearBox ? (
        <TimesCarryRow
          columns={columns}
          op1Cols={digitCount(a1)}
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
          errorMarks={errorMarks}
        />
      ) : null}

      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]} />
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          {operand(op1, p1)}
        </View>
      </View>
      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]}>
          <Text allowFontScaling={false} style={[sharedStyles.operator, { fontSize: digitSize }]}>
            {operatorSymbol[question.operation]}
          </Text>
        </View>
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          {operand(op2, p2)}
        </View>
      </View>
      <View
        style={[
          sharedStyles.rule,
          { width: columnAreaWidth, marginLeft: operatorWidth },
          // Multiplication has two rules — give the first one less breathing
          // room so the second (above the final sum) can have more.
          partials ? { marginVertical: 1 } : null,
        ]}
      />

      {partials && onSelectBox && onClearBox ? (
        <View>
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
              operatorWidth={operatorWidth}
              errorMarks={errorMarks}
            />
          ))}
          <View
            style={[
              sharedStyles.rule,
              {
                width: columnAreaWidth,
                marginLeft: operatorWidth,
                marginVertical: 5,
              },
            ]}
          />
        </View>
      ) : null}

      {carryInk && onSelectBox && onClearBox ? (
        // A gap above the carry row so the lifted clear ✕ clears the rule line
        // and partial products above it.
        <View style={styles.sumCarryWrap}>
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
            clearAbove
            errorMarks={errorMarks}
            leadingSkip={sumCarryLeadingSkip}
          />
        </View>
      ) : null}

      <View
        style={[
          sharedStyles.answerArea,
          { width: columnAreaWidth, marginLeft: operatorWidth },
        ]}
      >
        {answerSlot}
      </View>
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
  operatorWidth,
  errorMarks,
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
  /** Width of the left operator gutter where the "+" sign sits. */
  operatorWidth: number;
  errorMarks?: ReviewMarks | null;
}) {
  // Total `columns` cells: leading empties on the left, `width` digit cells,
  // then `rowIndex` placeholder-zero cells on the right (the partial-product
  // shift — taught as visible 0s to keep place-value explicit).
  const leading = Math.max(0, columns - width - rowIndex);
  const trailing = Math.max(0, columns - leading - width);
  return (
    <View style={styles.partialRow}>
      {/* Addition marker (+) for every partial-product row — the same
          left-gutter operator lane division uses for its "−". */}
      <View style={[styles.partialPlus, { width: operatorWidth }]}>
        <Text allowFontScaling={false} style={[sharedStyles.operator, { fontSize: digitSize }]}>+</Text>
      </View>
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
            status={errorMarks?.get(id) ?? null}
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
        <Text allowFontScaling={false} style={[styles.zeroDigit, { fontSize: digitSize }]}>0</Text>
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
  errorMarks,
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
  errorMarks?: ReviewMarks | null;
}) {
  const offsetCols = columns - op1Cols;
  return (
    <View style={[sharedStyles.carryRow, { marginLeft: operatorWidth }]}>
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

const styles = StyleSheet.create({
  sumCarryWrap: { marginTop: spacing.lg },
  partialRow: { flexDirection: 'row', marginTop: 2 },
  partialPlus: { alignItems: 'center', justifyContent: 'center' },
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
});
