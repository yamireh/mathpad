/**
 * SubtractionProblem — vertical subtraction: the top operand is tappable for
 * borrowing (crossed-out digit + adjusted value above, with a borrow arrow
 * animation), the bottom operand carries the `−` operator, then a rule and
 * the difference answer area.
 */
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TipBubble } from '../../ui';
import { spacing, typography } from '../../../constants/design';
import type { Question } from '../../../types';
import { BorrowArrow } from '../BorrowArrow';
import { computeBorrowDisplay, needsBorrow } from '../borrow';
import {
  type ProblemSizing,
  operatorSymbol,
  verticalGeometry,
} from '../layout';
import {
  DECIMAL_SEPARATOR,
  DigitCells,
  decimalDotWidth,
  gridWidth,
  sharedStyles,
} from './shared';

export interface SubtractionProblemProps {
  question: Question;
  /** The answer area (handwriting boxes) for the difference. */
  answerSlot: ReactNode;
  /** Tapped borrow-lender columns (top-operand digit indices). */
  borrowMarks: number[];
  /** Toggle a borrow on a top-operand digit; presence enables tap-to-borrow. */
  onToggleBorrow?: (column: number) => void;
  /** Accent colour for borrow marks. */
  tone: string;
  /** Column / box / digit sizing. */
  sizing: ProblemSizing;
}

/** Vertical subtraction layout. */
export function SubtractionProblem({
  question,
  answerSlot,
  borrowMarks,
  onToggleBorrow,
  tone,
  sizing,
}: SubtractionProblemProps) {
  const { t } = useTranslation();
  const [op1, op2] = question.operands;
  const { intCols, decCols } = verticalGeometry(question);
  const { cellWidth, digitSize, operatorWidth } = sizing;
  const columnAreaWidth = gridWidth(intCols, decCols, cellWidth);
  const scale = 10 ** decCols;
  const showBorrowTip =
    !!onToggleBorrow &&
    borrowMarks.length === 0 &&
    needsBorrow(Math.round(Math.abs(op1) * scale), Math.round(Math.abs(op2) * scale));

  return (
    <View>
      <TipBubble
        id="tap-to-borrow"
        when={showBorrowTip}
        text={t('practice.tips.tapToBorrow')}
        pointer="down"
        style={styles.borrowTip}
      />

      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]} />
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          {onToggleBorrow ? (
            <BorrowDigitRow
              value={op1}
              marks={borrowMarks}
              onToggle={onToggleBorrow}
              tone={tone}
              cellWidth={cellWidth}
              digitSize={digitSize}
              decCols={decCols}
            />
          ) : (
            <DigitCells
              value={op1}
              cellWidth={cellWidth}
              digitSize={digitSize}
              decCols={decCols}
            />
          )}
        </View>
      </View>
      <View style={sharedStyles.problemRow}>
        <View style={[sharedStyles.operatorColumn, { width: operatorWidth }]}>
          <Text style={[sharedStyles.operator, { fontSize: digitSize }]}>
            {operatorSymbol[question.operation]}
          </Text>
        </View>
        <View style={[sharedStyles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells
            value={op2}
            cellWidth={cellWidth}
            digitSize={digitSize}
            decCols={decCols}
          />
        </View>
      </View>
      <View
        style={[
          sharedStyles.rule,
          { width: columnAreaWidth, marginLeft: operatorWidth },
        ]}
      />
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
  decCols = 0,
}: {
  value: number;
  marks: number[];
  onToggle: (column: number) => void;
  tone: string;
  cellWidth: number;
  digitSize: number;
  decCols?: number;
}) {
  // Combined digit array (integer then decimal), with the dot at `dotAt`.
  // Borrowing operates on this array, so a borrow can cross the decimal point
  // (units lending into the tenths) just like any other column.
  const abs = Math.abs(value);
  const intDigits = String(Math.trunc(abs)).split('').map(Number);
  const decDigits =
    decCols > 0
      ? String(Math.round((abs - Math.trunc(abs)) * 10 ** decCols))
          .padStart(decCols, '0')
          .slice(-decCols)
          .split('')
          .map(Number)
      : [];
  const digits = [...intDigits, ...decDigits];
  const dotAt = decCols > 0 ? intDigits.length : -1;
  const display = computeBorrowDisplay(digits, marks);
  const dotWidth = decimalDotWidth(cellWidth);

  // The borrow arrow plays EVERY time the kid taps a digit to borrow —
  // it's a teaching aid, not a one-time tip.
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
    <View style={[sharedStyles.digitRow, styles.borrowRowAnchor]}>
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
              <Text style={[sharedStyles.digit, { fontSize: digitSize }]}>
                {digit}
              </Text>
              {crossedOut ? (
                <View style={[styles.strike, { backgroundColor: tone }]} />
              ) : null}
            </View>
          </View>
        );
        const cellNode = tappable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Borrow from ${digit}`}
            onPress={() => onToggle(i)}
          >
            {inner}
          </Pressable>
        ) : (
          inner
        );
        return (
          <Fragment key={i}>
            {i === dotAt ? (
              <View style={[styles.dotCell, { width: dotWidth }]}>
                <Text style={[sharedStyles.digit, { fontSize: digitSize }]}>
                  {DECIMAL_SEPARATOR}
                </Text>
              </View>
            ) : null}
            {cellNode}
          </Fragment>
        );
      })}
      {arrow ? (
        <View
          pointerEvents="none"
          style={[
            styles.arrowAnchor,
            // Shift right by the dot column when the lender sits in the
            // decimal part, so the arc lands over the right cells.
            { left: dotAt >= 0 && arrow.column >= dotAt ? dotWidth : 0 },
          ]}
        >
          <BorrowArrow
            key={arrow.key}
            column={arrow.column}
            cellCount={digits.length}
            cellWidth={cellWidth}
            tone={tone}
            onDone={() => setArrow(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  borrowTip: { marginBottom: spacing.xs },
  borrowRowAnchor: { position: 'relative', overflow: 'visible' },
  // Decimal point column — aligns its dot at the digit baseline (bottom) so it
  // sits level with the digits despite the annotation slot above them.
  dotCell: { alignItems: 'center', justifyContent: 'flex-end' },
  arrowAnchor: { position: 'absolute', top: 0 },
  cell: { alignItems: 'center' },
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
});
