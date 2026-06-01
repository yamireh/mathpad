/**
 * Shared primitives for the per-operation problem components: the digit-cell
 * row used by every layout, the tap-to-write carry row used by addition and
 * multiplication, and the common column-grid styles they all measure off.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../constants/design';
import { CarryBox } from '../CarryBox';
import { type InkStroke } from '../ink';
import { OPERATOR_COLUMN_WIDTH, PROBLEM_DIGIT_SIZE } from '../layout';

/** A number rendered as right-aligned, fixed-width digit cells. */
export function DigitCells({
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
    <View style={sharedStyles.digitRow}>
      {digits.map((digit, i) => (
        <View key={i} style={{ width: cellWidth, alignItems: 'center' }}>
          <Text style={[sharedStyles.digit, { fontSize: digitSize }]}>
            {digit}
          </Text>
        </View>
      ))}
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
    <View style={[sharedStyles.carryRow, { marginLeft: operatorWidth }]}>
      {Array.from({ length: columns }).map((_, i) => {
        const id = `carry-${i}`;
        return (
          <View key={i} style={{ width: cellWidth, alignItems: 'center' }}>
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
