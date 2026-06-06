import { Canvas, Path } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/design';
import type { BoxStatus, ReviewMarks } from '../../lib/review';
import { AnswerBox, fitTransform } from './AnswerBox';
import { BorrowArrow } from './BorrowArrow';
import { computeBorrowDisplay } from './borrow';
import { strokeToPath, type InkStroke } from './ink';
import {
  DIVISION_DRAFT_CELL_HEIGHT,
  DIVISION_DRAFT_CELL_WIDTH,
  DIVISION_MINUS_WIDTH,
  type LongDivisionStepMinuend,
  divisionDraftRowLayout,
} from './layout';

/** Vertical gap between adjacent draft rowGroups. */
const GRID_ROW_GAP = 2;
/**
 * Clear-button slot height that {@link AnswerBox} reserves ABOVE each compact
 * cell (cellWidth < DIGIT_COLUMN_WIDTH). The difference row below the rule
 * leads with this slot, so without compensation the rule hugs the product
 * boxes above while sitting far from the difference boxes below.
 */
const DRAFT_CLEAR_SLOT = 20;
/** Symmetric breathing room above and below the subtraction rule. */
const RULE_GAP = 8;

/**
 * One draft cell. A static box; on bring-down (`dropKey` changes), AnswerBox
 * slides just the digit down into it.
 */
function DraftCell({
  id,
  strokes,
  tone,
  selected,
  onSelect,
  onClear,
  cellWidth,
  dropKey,
  status,
}: {
  id: string;
  strokes: InkStroke[];
  tone?: string;
  selected: boolean;
  onSelect: () => void;
  onClear: () => void;
  cellWidth: number;
  dropKey: number;
  status?: BoxStatus | null;
}) {
  return (
    <AnswerBox
      accessibilityLabel={`Working row ${id}`}
      tone={tone}
      selected={selected}
      onSelect={onSelect}
      onClear={onClear}
      strokes={strokes}
      cellWidth={cellWidth}
      boxHeight={DIVISION_DRAFT_CELL_HEIGHT}
      status={status}
      dropKey={dropKey}
    />
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
  /**
   * Draft rows that render as read-only correct-digit labels (the kid's ink is
   * preserved underneath; Undo removes the row and it returns to editable
   * handwriting). Keyed by `dd` row index.
   */
  lockedDraftRows?: Set<number>;
  /** Correct digit per `dd-{row}-{col}` id, shown when a cell is locked. */
  draftLabels?: Map<string, number>;
  /**
   * The current step's subtraction minuend when it lives in a (locked) diff
   * row — its digits become tap-to-borrow. Null when the active minuend is the
   * dividend (rendered in the header) or there's nothing to borrow on.
   */
  activeMinuend?: LongDivisionStepMinuend | null;
  /** Lender indices (into `activeMinuend.digits`) already tapped for borrow. */
  borrowLenders?: number[];
  /** Toggle a borrow lender on the active minuend. */
  onBorrow?: (lenderIndex: number) => void;
  /** Review error-highlight marks keyed by box id (`dd-{row}-{col}`). */
  errorMarks?: ReviewMarks | null;
}

/**
 * A locked draft cell: shows the kid's OWN ink, read-only (so it's clearly
 * their input, never silently replaced with the correct digit). On the active
 * minuend row each digit is tap-to-borrow, showing the subtraction's cross-out
 * + reduced value exactly like the Subtraction feature.
 */
function LabelCell({
  strokes,
  value,
  cellWidth,
  tone,
  crossedOut,
  annotation,
  onBorrow,
}: {
  strokes: InkStroke[];
  /** Correct digit — used only for the borrow accessibility label. */
  value: number | undefined;
  cellWidth: number;
  tone?: string;
  crossedOut?: boolean;
  annotation?: number | null;
  onBorrow?: () => void;
}) {
  const inner = cellWidth - 12;
  const transform = fitTransform(strokes, inner, DIVISION_DRAFT_CELL_HEIGHT);
  const content = (
    <>
      <View style={styles.labelClearSlot}>
        {annotation != null ? (
          <Text style={[styles.labelAnnotation, { color: tone ?? colors.text }]}>
            {annotation}
          </Text>
        ) : null}
      </View>
      <View style={[styles.labelBox, { width: inner }]}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              path={strokeToPath(stroke, transform)}
              color={colors.text}
              style="stroke"
              strokeWidth={2.5}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Canvas>
        {crossedOut ? (
          <View
            style={[styles.labelStrike, { backgroundColor: tone ?? colors.text }]}
          />
        ) : null}
      </View>
    </>
  );
  return (
    <View style={{ width: cellWidth, alignItems: 'center' }}>
      {onBorrow ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Borrow from ${value}`}
          onPress={onBorrow}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

/**
 * Replays the `+10` borrow arc over the minuend row whenever a new lender is
 * tapped — same teaching animation as Subtraction's BorrowDigitRow.
 */
function DraftBorrowArrow({
  lenders,
  minuendLength,
  cellWidth,
  leftOffset,
  tone,
}: {
  lenders: number[];
  minuendLength: number;
  cellWidth: number;
  leftOffset: number;
  tone?: string;
}) {
  const prevCount = useRef(lenders.length);
  const [arrow, setArrow] = useState<{ column: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    if (lenders.length > prevCount.current) {
      const last = lenders[lenders.length - 1];
      if (last >= 0 && last < minuendLength - 1) {
        setArrow({ column: last, key: Date.now() });
      }
    }
    prevCount.current = lenders.length;
  }, [lenders, minuendLength]);
  if (!arrow) return null;
  return (
    <View pointerEvents="none" style={[styles.arrowAnchor, { left: leftOffset }]}>
      <BorrowArrow
        key={arrow.key}
        column={arrow.column}
        cellCount={minuendLength}
        cellWidth={cellWidth}
        tone={tone}
        onDone={() => setArrow(null)}
      />
    </View>
  );
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
  lockedDraftRows,
  draftLabels,
  activeMinuend = null,
  borrowLenders,
  onBorrow,
  errorMarks,
}: DivisionDraftGridProps) {
  if (columns <= 0 || rows <= 0) return null;
  const layoutOptions =
    divisorDigits && integerQuotientDigits
      ? { divisorDigits, integerQuotientDigits }
      : undefined;
  const lenders = borrowLenders ?? [];
  // Borrow display for the active minuend row (cross-out + reduced values),
  // computed once from the known minuend digits.
  const borrowDisplay =
    activeMinuend && lenders.length > 0
      ? computeBorrowDisplay(activeMinuend.digits, lenders)
      : null;
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
              {/* Fixed left lane (inside the scroll content) reserved on
                  every row so columns stay aligned. The subtraction marker
                  (−) is drawn only on the product row of each step — i.e.
                  before the second row of each two-row draft section, the
                  subtrahend being taken away. */}
              <View style={styles.minus}>
                {isProductRow ? <Text style={styles.minusSign}>−</Text> : null}
              </View>
              {leadingWidth > 0 ? (
                <View style={{ width: leadingWidth }} />
              ) : null}
              {Array.from({ length: cellCount }).map((_, i) => {
                const col = startCol + i;
                const id = `dd-${row}-${col}`;
                const locked = lockedDraftRows?.has(row) ?? false;
                if (locked) {
                  const isMinuendCell =
                    !!activeMinuend &&
                    !activeMinuend.inDividend &&
                    activeMinuend.diffRow === row;
                  const mIdx = isMinuendCell
                    ? activeMinuend.cols.indexOf(col)
                    : -1;
                  const disp =
                    borrowDisplay && mIdx >= 0 ? borrowDisplay[mIdx] : null;
                  return (
                    <LabelCell
                      key={col}
                      strokes={ink[row]?.[col] ?? []}
                      value={draftLabels?.get(id)}
                      cellWidth={cellWidth}
                      tone={tone}
                      crossedOut={disp?.crossedOut}
                      annotation={disp?.crossedOut ? disp.value : null}
                      onBorrow={
                        mIdx >= 0 && onBorrow
                          ? () => onBorrow(mIdx)
                          : undefined
                      }
                    />
                  );
                }
                const dropKey =
                  bringDownPulse?.cellId === id ? bringDownPulse.nonce : 0;
                return (
                  <DraftCell
                    key={col}
                    id={`${row + 1}, column ${col + 1}`}
                    tone={tone}
                    selected={selectedBox === id}
                    onSelect={() => onSelect(id)}
                    onClear={() => onClear(id)}
                    strokes={ink[row]?.[col] ?? []}
                    cellWidth={cellWidth}
                    dropKey={dropKey}
                    status={errorMarks?.get(id) ?? null}
                  />
                );
              })}
              {activeMinuend &&
              !activeMinuend.inDividend &&
              activeMinuend.diffRow === row ? (
                <DraftBorrowArrow
                  lenders={lenders}
                  minuendLength={activeMinuend.digits.length}
                  cellWidth={cellWidth}
                  leftOffset={
                    DIVISION_MINUS_WIDTH +
                    leadingWidth +
                    (activeMinuend.cols[0] - startCol) * cellWidth
                  }
                  tone={tone}
                />
              ) : null}
            </View>
            {isProductRow ? (
              <View style={styles.ruleRow}>
                {/* Match the row's minus lane + step shift so the rule
                    lines up under the cells. */}
                <View style={{ width: DIVISION_MINUS_WIDTH }} />
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
  // Bottom slack so a trailing product row's rule (pulled down past the row
  // group's measured height by the negative-margin spacing) isn't clipped by
  // the horizontal ScrollView. Must exceed `DRAFT_CLEAR_SLOT + GRID_ROW_GAP −
  // RULE_GAP` (the rule's overflow).
  grid: { gap: GRID_ROW_GAP, paddingBottom: DRAFT_CLEAR_SLOT },
  rowGroup: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  minus: {
    width: DIVISION_MINUS_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusSign: {
    fontSize: 26,
    color: colors.text,
    fontWeight: typography.weight.medium,
    lineHeight: 28,
  },
  ruleRow: {
    flexDirection: 'row',
    marginTop: RULE_GAP,
    // Pull the difference row up by its clear-slot (and the grid gap) so the
    // rule clears the difference boxes below by the same RULE_GAP it clears
    // the product boxes above — i.e. equal padding top and bottom.
    marginBottom: RULE_GAP - DRAFT_CLEAR_SLOT - GRID_ROW_GAP,
  },
  rule: {
    height: 2,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  // Locked-cell label (matches AnswerBox's clear-slot + box footprint so
  // locked rows stay aligned with editable rows).
  labelClearSlot: {
    height: DRAFT_CLEAR_SLOT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  labelAnnotation: {
    fontSize: 14,
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  labelBox: {
    height: DIVISION_DRAFT_CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelStrike: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-12deg' }],
  },
  arrowAnchor: { position: 'absolute', top: 0 },
});
