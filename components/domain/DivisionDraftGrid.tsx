import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/design';
import { AnswerBox } from './AnswerBox';
import { type InkStroke } from './ink';
import {
  DIVISION_DRAFT_CELL_HEIGHT,
  DIVISION_DRAFT_CELL_WIDTH,
  DIVISION_MINUS_WIDTH,
  divisionDraftRowLayout,
} from './layout';

/** Duration of the bring-down drop animation. */
const BRING_DOWN_MS = 900;
/**
 * Estimated distance from the top of the draft grid up to the dividend
 * digit row inside the bracket, in cell-heights. Tuned visually so the
 * drop starts in the dividend area instead of just above the target cell.
 */
const DIVIDEND_GAP_CELLS = 2;

/**
 * One draft cell. Owns a per-cell Animated.Value used for the bring-down
 * drop animation in the auto-solver: when `dropKey` changes to a positive
 * number, the cell's contents start at the dividend row (rows above)
 * fully visible and slide all the way down into the cell.
 */
function DraftCell({
  id,
  rowIdx,
  strokes,
  tone,
  selected,
  onSelect,
  onClear,
  cellWidth,
  dropKey,
}: {
  id: string;
  rowIdx: number;
  strokes: InkStroke[];
  tone?: string;
  selected: boolean;
  onSelect: () => void;
  onClear: () => void;
  cellWidth: number;
  dropKey: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (dropKey <= 0) return;
    const drop =
      (rowIdx + DIVIDEND_GAP_CELLS) * DIVISION_DRAFT_CELL_HEIGHT;
    translateY.setValue(-drop);
    Animated.timing(translateY, {
      toValue: 0,
      duration: BRING_DOWN_MS,
      useNativeDriver: true,
    }).start();
  }, [dropKey, rowIdx, translateY]);

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <AnswerBox
        accessibilityLabel={`Working row ${id}`}
        tone={tone}
        selected={selected}
        onSelect={onSelect}
        onClear={onClear}
        strokes={strokes}
        cellWidth={cellWidth}
        boxHeight={DIVISION_DRAFT_CELL_HEIGHT}
      />
    </Animated.View>
  );
}

export interface DivisionDraftGridProps {
  /** Dividend digit count — drives the column count. */
  columns: number;
  /** Number of step rows to render. */
  rows: number;
  /** Cell ink keyed by `[row][col]`; missing entries render as empty cells. */
  ink: InkStroke[][][];
  /** Currently pad-focused box id; cells highlight when selected. */
  selectedBox: string | null;
  /** Focus the writing pad on one draft cell. */
  onSelect: (boxId: string) => void;
  /** Clear one draft cell's ink. */
  onClear: (boxId: string) => void;
  tone?: string;
  /**
   * Cell width — should match the dividend digit cell width so columns
   * align. Defaults to {@link DIVISION_DRAFT_CELL_WIDTH}.
   */
  cellWidth?: number;
  /**
   * Divisor digit count — used so rows can expand leftward when a step's
   * product is wider than the default pair-shift template (e.g. wide
   * divisors in decimal-expansion steps).
   */
  divisorDigits?: number;
  /**
   * Integer-part quotient digit count — combined with `columns` to derive
   * the dividend-quotient offset used by the row layout.
   */
  integerQuotientDigits?: number;
  /**
   * Bring-down animation trigger. When the auto-solver wants a cell's
   * brought-down digit to drop in visibly, it bumps the nonce for that
   * cell id. Set to `null` for normal use.
   */
  bringDownPulse?: { cellId: string; nonce: number } | null;
}

/**
 * The structured work area inside a long-division bracket. Each pair of
 * rows (product + difference for one quotient step) is offset by one
 * column from the previous pair — the same staircase a kid writes on
 * paper. A "−" sign sits at the left of each product row and a thin rule
 * runs between the product and its difference, matching the standard
 * long-division notation. Cell ids use absolute column positions
 * (`dd-{row}-{absoluteCol}`) so vertical alignment with the dividend is
 * preserved regardless of how the rows are shifted.
 */
export function DivisionDraftGrid({
  columns,
  rows,
  ink,
  selectedBox,
  onSelect,
  onClear,
  tone,
  cellWidth = DIVISION_DRAFT_CELL_WIDTH,
  divisorDigits,
  integerQuotientDigits,
  bringDownPulse = null,
}: DivisionDraftGridProps) {
  if (columns <= 0 || rows <= 0) return null;
  const layoutOptions =
    divisorDigits && integerQuotientDigits
      ? { divisorDigits, integerQuotientDigits }
      : undefined;
  return (
    <View style={styles.grid}>
      {Array.from({ length: rows }).map((_, row) => {
        const { startCol, cellCount } = divisionDraftRowLayout(
          row,
          columns,
          layoutOptions,
        );
        const isProductRow = row % 2 === 0;
        const leadingWidth = startCol * cellWidth;
        const cellsWidth = cellCount * cellWidth;
        return (
          <View key={row} style={styles.rowGroup}>
            <View style={styles.row}>
              {/* Subtraction marker (−) for product rows. Sits in the
                  leading spacer for shifted steps, or in the bracket's
                  paddingLeft area for step 0 (via negative margin). */}
              {isProductRow ? (
                <View
                  style={[
                    styles.minus,
                    leadingWidth > 0
                      ? { width: leadingWidth, paddingRight: 4 }
                      : { marginLeft: -DIVISION_MINUS_WIDTH, width: DIVISION_MINUS_WIDTH },
                  ]}
                >
                  <Text style={styles.minusSign}>−</Text>
                </View>
              ) : leadingWidth > 0 ? (
                <View style={{ width: leadingWidth }} />
              ) : null}
              {Array.from({ length: cellCount }).map((_, i) => {
                const col = startCol + i;
                const id = `dd-${row}-${col}`;
                const dropKey =
                  bringDownPulse?.cellId === id ? bringDownPulse.nonce : 0;
                return (
                  <DraftCell
                    key={col}
                    id={`${row + 1}, column ${col + 1}`}
                    rowIdx={row}
                    tone={tone}
                    selected={selectedBox === id}
                    onSelect={() => onSelect(id)}
                    onClear={() => onClear(id)}
                    strokes={ink[row]?.[col] ?? []}
                    cellWidth={cellWidth}
                    dropKey={dropKey}
                  />
                );
              })}
            </View>
            {isProductRow ? (
              <View style={styles.ruleRow}>
                {leadingWidth > 0 ? (
                  <View style={{ width: leadingWidth }} />
                ) : null}
                <View style={[styles.rule, { width: cellsWidth }]} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 2 },
  rowGroup: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  minus: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  minusSign: {
    fontSize: 26,
    color: colors.text,
    fontWeight: typography.weight.medium,
    lineHeight: 28,
  },
  ruleRow: { flexDirection: 'row', marginTop: 1, marginBottom: 1 },
  rule: {
    height: 2,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
});
