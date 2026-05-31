import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  View,
} from 'react-native';

import { Card } from '../ui';
import { colors, radius, spacing, typography } from '../../constants/design';
import type { QuestionResult } from '../../types';
import { formatAnswer, formatProblem, formatSubmittedAnswer } from './format';

export interface QuestionResultRowProps {
  result: QuestionResult;
  /** 1-based question number. */
  number: number;
  onPress?: () => void;
}

/** Soft background tint per status — readable, kid-friendly. */
const STATUS_TINT = {
  correct: '#ECFDF3',
  wrong: '#FFF1EE',
} as const;

/**
 * One row in the Score / History question list.
 *
 * Correct rows show a single inline equation. Wrong rows show a small
 * label-value grid that contrasts the kid's answer against the correct
 * one, with a coloured left stripe + tinted background so the kid can
 * read the verdict at a glance.
 */
export function QuestionResultRow({
  result,
  number,
  onPress,
}: QuestionResultRowProps) {
  const { t } = useTranslation();
  const { question, submittedAnswer, status } = result;
  const correct = status === 'correct_first_try' || status === 'fixed';
  const statusColor = correct ? colors.correct : colors.wrong;
  const tint = correct ? STATUS_TINT.correct : STATUS_TINT.wrong;
  const kidAnswer = formatSubmittedAnswer(question, submittedAnswer);
  const correctAnswer = formatAnswer(question.answer);

  return (
    <Card
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: tint, borderLeftColor: statusColor },
      ]}
      accessibilityLabel={`${t('score.questionLabel', { number })}, ${
        correct ? t('score.encouragement.great') : t('score.blankAnswer')
      }`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons
            name={correct ? 'checkmark' : 'close'}
            size={20}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.questionTitle}>
          {t('score.questionLabel', { number })}
        </Text>
        {status === 'fixed' ? (
          <View style={styles.fixedBadge}>
            <Text style={styles.fixedBadgeText}>{t('score.fixedBadge')}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.problemText}>{formatProblem(question)}</Text>
      <View style={styles.compareGrid}>
        <CompareRow
          label={t('score.yourAnswer')}
          value={kidAnswer ?? t('score.blankAnswer')}
          valueStyle={[
            correct ? styles.correctValue : styles.wrongValue,
            kidAnswer === null ? styles.blankValue : null,
          ]}
        />
        {!correct ? (
          <CompareRow
            label={t('score.correctAnswer')}
            value={correctAnswer}
            valueStyle={styles.correctValue}
          />
        ) : null}
      </View>
    </Card>
  );
}

function CompareRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderLeftWidth: 4,
    borderColor: 'transparent',
    paddingVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionTitle: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  fixedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.correct,
  },
  fixedBadgeText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.correct,
  },
  problemText: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  correctValue: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.correct,
    fontVariant: ['tabular-nums'],
  },
  wrongValue: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.wrong,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  blankValue: {
    fontStyle: 'italic',
    fontWeight: typography.weight.regular,
    textDecorationLine: 'none',
    color: colors.textMuted,
  },
  compareGrid: {
    marginTop: spacing.xs,
    paddingLeft: 40,
    gap: spacing.xs,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  compareLabel: {
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
});
