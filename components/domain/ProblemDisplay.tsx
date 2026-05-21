import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import type { ProblemLayout, Question } from '../../types';
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
}

/** Renders a math problem and places its answer area, per question layout. */
export function ProblemDisplay({
  question,
  answerSlot,
  layout,
  workSlot,
}: ProblemDisplayProps) {
  const effective = layout ?? question.layout;
  switch (effective) {
    case 'vertical':
      return <VerticalProblem question={question} answerSlot={answerSlot} />;
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

function VerticalProblem({
  question,
  answerSlot,
}: Pick<ProblemDisplayProps, 'question' | 'answerSlot'>) {
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
          <DigitCells value={op1} />
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
}: Pick<ProblemDisplayProps, 'question' | 'answerSlot'>) {
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
 * Long-division ("bracket") layout. The bracket is drawn as connected lines —
 * a left vertical rule and a top overline meeting at the corner — with the
 * quotient above, the divisor to the left, and a tall intermediate-work
 * surface filling the space below the dividend.
 */
function LongDivisionProblem({
  question,
  answerSlot,
  workSlot,
}: Pick<ProblemDisplayProps, 'question' | 'answerSlot' | 'workSlot'>) {
  const [dividend, divisor] = question.operands;
  return (
    <View style={styles.longContainer}>
      {/* Quotient — above the overline, nudged right past the divisor. */}
      <View style={styles.longTopRow}>
        <Text style={[styles.problemText, styles.hidden]}>{divisor}</Text>
        <View style={styles.longQuotient}>{answerSlot}</View>
      </View>

      {/* Divisor, then the bracketed dividend + work area. */}
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
  problemRow: { flexDirection: 'row', alignItems: 'center' },
  operatorColumn: {
    width: OPERATOR_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
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
  /* Long division */
  longContainer: { flex: 1, alignSelf: 'stretch' },
  longTopRow: { flexDirection: 'row', alignItems: 'flex-end' },
  hidden: { opacity: 0 },
  longQuotient: { paddingLeft: spacing.md, paddingBottom: spacing.xs },
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
  longWork: { flex: 1, minHeight: 200, marginRight: spacing.sm },
});
