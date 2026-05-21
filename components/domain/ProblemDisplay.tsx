import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
import { computeBorrowDisplay } from './borrow';
import {
  DIGIT_COLUMN_WIDTH,
  OPERATOR_COLUMN_WIDTH,
  PROBLEM_DIGIT_SIZE,
  answerShape,
  digitCount,
  operatorSymbol,
} from './layout';

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
  /** Accent colour for borrow marks. */
  tone?: string;
}

/** Renders a math problem and places its answer area, per question layout. */
export function ProblemDisplay({
  question,
  answerSlot,
  layout,
  workSlot,
  borrowMarks,
  onToggleBorrow,
  tone = colors.text,
}: ProblemDisplayProps) {
  const effective = layout ?? question.layout;
  switch (effective) {
    case 'vertical':
      return (
        <VerticalProblem
          question={question}
          answerSlot={answerSlot}
          borrowMarks={borrowMarks ?? []}
          onToggleBorrow={onToggleBorrow}
          tone={tone}
        />
      );
    case 'divisionLong':
      return (
        <LongDivisionProblem
          question={question}
          answerSlot={answerSlot}
          workSlot={workSlot}
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
function DigitCells({ value }: { value: number }) {
  const digits = String(Math.abs(value)).split('');
  return (
    <View style={styles.digitRow}>
      {digits.map((digit, i) => (
        <View key={i} style={styles.cell}>
          <Text style={styles.digit}>{digit}</Text>
        </View>
      ))}
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
}: {
  value: number;
  marks: number[];
  onToggle: (column: number) => void;
  tone: string;
}) {
  const digits = String(Math.abs(value)).split('').map(Number);
  const display = computeBorrowDisplay(digits, marks);

  return (
    <View style={styles.digitRow}>
      {digits.map((digit, i) => {
        const { value: shown, crossedOut } = display[i];
        const inner = (
          <View style={styles.cell}>
            <View style={styles.annotationSlot}>
              {crossedOut ? (
                <Text style={[styles.annotation, { color: tone }]}>
                  {shown}
                </Text>
              ) : null}
            </View>
            <View style={styles.digitWrap}>
              <Text style={styles.digit}>{digit}</Text>
              {crossedOut ? (
                <View style={[styles.strike, { backgroundColor: tone }]} />
              ) : null}
            </View>
          </View>
        );
        // Every digit except the units (last) can lend.
        return i < digits.length - 1 ? (
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
    </View>
  );
}

function VerticalProblem({
  question,
  answerSlot,
  borrowMarks,
  onToggleBorrow,
  tone,
}: {
  question: Question;
  answerSlot: ReactNode;
  borrowMarks: number[];
  onToggleBorrow?: (column: number) => void;
  tone: string;
}) {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const answerColumns = shape.integerBoxes + (shape.hasSign ? 1 : 0);
  const columns = Math.max(digitCount(op1), digitCount(op2), answerColumns);
  const columnAreaWidth = columns * DIGIT_COLUMN_WIDTH;

  return (
    <View>
      <View style={styles.problemRow}>
        <View style={styles.operatorColumn} />
        <View style={[styles.columnArea, { width: columnAreaWidth }]}>
          {onToggleBorrow ? (
            <BorrowDigitRow
              value={op1}
              marks={borrowMarks}
              onToggle={onToggleBorrow}
              tone={tone}
            />
          ) : (
            <DigitCells value={op1} />
          )}
        </View>
      </View>
      <View style={styles.problemRow}>
        <View style={styles.operatorColumn}>
          <Text style={styles.operator}>
            {operatorSymbol[question.operation]}
          </Text>
        </View>
        <View style={[styles.columnArea, { width: columnAreaWidth }]}>
          <DigitCells value={op2} />
        </View>
      </View>
      <View
        style={[
          styles.rule,
          { width: columnAreaWidth, marginLeft: OPERATOR_COLUMN_WIDTH },
        ]}
      />
      <View
        style={[
          styles.answerArea,
          { width: columnAreaWidth, marginLeft: OPERATOR_COLUMN_WIDTH },
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
    <View style={styles.horizontalRow}>
      <Text style={styles.problemText}>{dividend}</Text>
      <Text style={styles.problemText}>÷</Text>
      <Text style={styles.problemText}>{divisor}</Text>
      <Text style={styles.problemText}>=</Text>
      {answerSlot}
    </View>
  );
}

/**
 * Long-division ("bracket") layout — connected left rule + top overline, the
 * quotient above, divisor to the left, and a tall work surface below.
 */
function LongDivisionProblem({
  question,
  answerSlot,
  workSlot,
}: {
  question: Question;
  answerSlot: ReactNode;
  workSlot?: ReactNode;
}) {
  const [dividend, divisor] = question.operands;
  return (
    <View style={styles.longContainer}>
      <View style={styles.longTopRow}>
        <Text style={[styles.problemText, styles.hidden]}>{divisor}</Text>
        <View style={styles.longQuotient}>{answerSlot}</View>
      </View>
      <View style={styles.longMainRow}>
        <Text style={[styles.problemText, styles.longDivisor]}>{divisor}</Text>
        <View style={styles.longBracket}>
          <Text style={[styles.problemText, styles.longDividend]}>
            {dividend}
          </Text>
          {workSlot ? <View style={styles.longWork}>{workSlot}</View> : null}
        </View>
      </View>
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
  cell: { width: DIGIT_COLUMN_WIDTH, alignItems: 'center' },
  digit: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
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
  rule: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.text,
    marginVertical: spacing.sm,
  },
  answerArea: { flexDirection: 'row', justifyContent: 'flex-end' },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  problemText: {
    fontSize: PROBLEM_DIGIT_SIZE,
    fontWeight: typography.weight.regular,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  longContainer: { flex: 1, alignSelf: 'stretch' },
  longTopRow: { flexDirection: 'row', alignItems: 'flex-end' },
  hidden: { opacity: 0 },
  longQuotient: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.xs },
  longMainRow: { flexDirection: 'row', flex: 1, alignItems: 'stretch' },
  longDivisor: { paddingRight: spacing.sm, paddingTop: spacing.md },
  longBracket: {
    flex: 1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.text,
    paddingLeft: spacing.md,
  },
  longDividend: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  longWork: { flex: 1, minHeight: 300, marginRight: spacing.sm },
});
