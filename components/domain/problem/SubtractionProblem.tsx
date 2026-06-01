/**
 * SubtractionProblem — vertical subtraction: the top operand is tappable for
 * borrowing (crossed-out digit + adjusted value above, with a borrow arrow
 * animation), the bottom operand carries the `−` operator, then a rule and
 * the difference answer area.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TipBubble } from '../../ui';
import { spacing, typography } from '../../../constants/design';
import type { Question } from '../../../types';
import { BorrowArrow } from '../BorrowArrow';
import { computeBorrowDisplay, needsBorrow } from '../borrow';
import {
  type ProblemSizing,
  answerShape,
  digitCount,
  operatorSymbol,
} from '../layout';
import { DigitCells, sharedStyles } from './shared';

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
  const shape = answerShape(question);
  const answerColumns = shape.integerBoxes + (shape.hasSign ? 1 : 0);
  const columns = Math.max(digitCount(op1), digitCount(op2), answerColumns);
  const { cellWidth, digitSize, operatorWidth } = sizing;
  const columnAreaWidth = columns * cellWidth;
  const showBorrowTip =
    !!onToggleBorrow && borrowMarks.length === 0 && needsBorrow(op1, op2);

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
            />
          ) : (
            <DigitCells value={op1} cellWidth={cellWidth} digitSize={digitSize} />
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
          <DigitCells value={op2} cellWidth={cellWidth} digitSize={digitSize} />
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

const styles = StyleSheet.create({
  borrowTip: { marginBottom: spacing.xs },
  borrowRowAnchor: { position: 'relative', overflow: 'visible' },
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
