import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import type { Question } from '../../types';
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
}

/** Renders a math problem and places its answer area, per question layout. */
export function ProblemDisplay({ question, answerSlot }: ProblemDisplayProps) {
  switch (question.layout) {
    case 'vertical':
      return <VerticalProblem question={question} answerSlot={answerSlot} />;
    case 'divisionLong':
      return <LongDivisionProblem question={question} answerSlot={answerSlot} />;
    case 'divisionHorizontal':
    case 'divisionDecimal':
      return (
        <HorizontalDivisionProblem question={question} answerSlot={answerSlot} />
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

function VerticalProblem({ question, answerSlot }: ProblemDisplayProps) {
  const [op1, op2] = question.operands;
  const shape = answerShape(question);
  const answerColumns = shape.integerBoxes + (shape.hasSign ? 1 : 0);
  const columns = Math.max(
    digitCount(op1),
    digitCount(op2),
    answerColumns,
  );
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
}: ProblemDisplayProps) {
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

function LongDivisionProblem({ question, answerSlot }: ProblemDisplayProps) {
  const [dividend, divisor] = question.operands;
  return (
    <View>
      {/* Quotient sits above the dividend; hidden copies of the divisor and
          bracket act as spacers so it lines up. */}
      <View style={styles.longRow}>
        <Text style={[styles.problemText, styles.hidden]}>{divisor}</Text>
        <Text style={[styles.bracket, styles.hidden]}>)</Text>
        <View style={styles.longQuotient}>{answerSlot}</View>
      </View>
      <View style={styles.longRow}>
        <Text style={styles.problemText}>{divisor}</Text>
        <Text style={styles.bracket}>)</Text>
        <View style={styles.longDividend}>
          <Text style={styles.problemText}>{dividend}</Text>
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
  longRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bracket: {
    fontSize: PROBLEM_DIGIT_SIZE + 8,
    color: colors.text,
    marginHorizontal: spacing.xs,
  },
  hidden: { opacity: 0 },
  longQuotient: { paddingBottom: spacing.xs },
  longDividend: {
    borderTopWidth: 3,
    borderColor: colors.text,
    paddingTop: spacing.xs,
  },
});
