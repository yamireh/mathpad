/**
 * Shared primitives for the per-operation problem components: the digit-cell
 * row used by every layout, the tap-to-write carry row used by addition and
 * multiplication, and the common column-grid styles they all measure off.
 */
import { getLocales } from 'expo-localization';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../constants/design';
import type { ReviewMarks } from '../../../lib/review';
import { CarryBox } from '../CarryBox';
import { type InkStroke } from '../ink';
import { OPERATOR_COLUMN_WIDTH, PROBLEM_DIGIT_SIZE } from '../layout';

/** Locale decimal separator, pre-printed (never handwritten). */
export const DECIMAL_SEPARATOR = getLocales()[0]?.decimalSeparator ?? '.';

/** Width of the (non-digit) decimal-point column. Same in operands + answer. */
export function decimalDotWidth(cellWidth: number): number {
  return Math.round(cellWidth * 0.5);
}

/** Total width of a vertical column grid (integer cells + dot + decimal cells). */
export function gridWidth(
  intCols: number,
  decCols: number,
  cellWidth: number,
): number {
  return (
    (intCols + decCols) * cellWidth +
    (decCols > 0 ? decimalDotWidth(cellWidth) : 0)
  );
}

/**
 * A number rendered as right-aligned, fixed-width digit cells. With
 * `decCols > 0` it renders integer digits, a pre-printed decimal point, then
 * `decCols` decimal digits (trailing-zero padded) so operands and answer align
 * on the dot.
 */
export function DigitCells({
  value,
  cellWidth,
  digitSize,
  decCols = 0,
}: {
  value: number;
  cellWidth: number;
  digitSize: number;
  decCols?: number;
}) {
  const abs = Math.abs(value);
  const intCells = String(Math.trunc(abs)).split('');
  const decCells =
    decCols > 0
      ? String(Math.round((abs - Math.trunc(abs)) * 10 ** decCols))
          .padStart(decCols, '0')
          .slice(-decCols)
          .split('')
      : [];
  const cell = (d: string, key: string) => (
    <View key={key} style={{ width: cellWidth, alignItems: 'center' }}>
      <Text style={[sharedStyles.digit, { fontSize: digitSize }]}>{d}</Text>
    </View>
  );
  return (
    <View style={sharedStyles.digitRow}>
      {intCells.map((d, i) => cell(d, `i${i}`))}
      {decCols > 0 ? (
        <View
          style={[styles.dotCell, { width: decimalDotWidth(cellWidth) }]}
        >
          <Text style={[sharedStyles.digit, { fontSize: digitSize }]}>
            {DECIMAL_SEPARATOR}
          </Text>
        </View>
      ) : null}
      {decCells.map((d, i) => cell(d, `d${i}`))}
    </View>
  );
}

/**
 * A decimal operand for MULTIPLICATION: the digit string in fixed-width cells
 * (so it right-aligns with the integer partial-product rows) plus a thin
 * decimal-point mark overlaid between the integer and fractional digits — the
 * point doesn't take a column, matching how decimal × is laid out (multiply
 * the digits, place the point in the product).
 */
export function ThinDotDigits({
  value,
  places,
  cellWidth,
  digitSize,
}: {
  value: number;
  places: number;
  cellWidth: number;
  digitSize: number;
}) {
  const digits = String(Math.round(Math.abs(value) * 10 ** places)).split('');
  const intCount = digits.length - places;
  return (
    <View style={styles.thinDotRow}>
      {digits.map((d, i) => (
        <View key={i} style={{ width: cellWidth, alignItems: 'center' }}>
          <Text style={[sharedStyles.digit, { fontSize: digitSize }]}>{d}</Text>
        </View>
      ))}
      {places > 0 ? (
        <Text
          style={[
            sharedStyles.digit,
            styles.thinDot,
            { fontSize: digitSize, left: intCount * cellWidth - cellWidth * 0.12 },
          ]}
        >
          {DECIMAL_SEPARATOR}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A row of small tap-to-write carry boxes, one above each column but the units.
 * Tapping a box focuses the writing pad on it, exactly like an answer box.
 */
export function CarryRow({
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
  dotIndex,
  errorMarks,
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
  /** Insert the decimal-point spacer before this grid column (= intCols). */
  dotIndex?: number;
  /** Review error-highlight marks keyed by box id. */
  errorMarks?: ReviewMarks | null;
}) {
  return (
    <View style={[sharedStyles.carryRow, { marginLeft: operatorWidth }]}>
      {Array.from({ length: columns }).map((_, i) => {
        const id = `carry-${i}`;
        return (
          <Fragment key={i}>
            {dotIndex !== undefined && i === dotIndex ? (
              <View style={{ width: decimalDotWidth(cellWidth) }} />
            ) : null}
            <View style={{ width: cellWidth, alignItems: 'center' }}>
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
                  status={errorMarks?.get(id) ?? null}
                />
              ) : null}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

/** Column-grid atoms shared across the per-operation problem components. */
export const sharedStyles = StyleSheet.create({
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
  digit: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  carryRow: { flexDirection: 'row', marginBottom: 2 },
  rule: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.text,
    marginVertical: 2,
  },
  answerArea: { flexDirection: 'row', justifyContent: 'flex-end' },
});

const styles = StyleSheet.create({
  dotCell: { alignItems: 'center', justifyContent: 'flex-end' },
  thinDotRow: { flexDirection: 'row', position: 'relative' },
  // The decimal point sits at the bottom (baseline) between two digit cells,
  // overlaid so it takes no column width.
  thinDot: { position: 'absolute', bottom: 0 },
});
