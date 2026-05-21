import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

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

/** One row in the Score / History question list. */
export function QuestionResultRow({
  result,
  number,
  onPress,
}: QuestionResultRowProps) {
  const { t } = useTranslation();
  const { question, submittedAnswer, status } = result;
  const correct = status === 'correct_first_try' || status === 'fixed';
  const kidAnswer = formatSubmittedAnswer(question, submittedAnswer);

  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${t('score.questionLabel', { number })}, ${
        correct ? t('score.encouragement.great') : t('score.blankAnswer')
      }`}
    >
      <View
        style={[
          styles.status,
          { backgroundColor: correct ? colors.correct : colors.wrong },
        ]}
      >
        <Ionicons
          name={correct ? 'checkmark' : 'close'}
          size={18}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.problem}>
          {t('score.questionLabel', { number })} · {formatProblem(question)}
        </Text>
        <View style={styles.answers}>
          {correct ? (
            <Text style={styles.correct}>{formatAnswer(question.answer)}</Text>
          ) : (
            <>
              <Text style={styles.wrong}>
                {kidAnswer ?? t('score.blankAnswer')}
              </Text>
              <Text style={styles.muted}>→</Text>
              <Text style={styles.correct}>
                {formatAnswer(question.answer)}
              </Text>
            </>
          )}
        </View>
      </View>

      {status === 'fixed' ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('score.fixedBadge')}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  status: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xs },
  problem: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  answers: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrong: {
    fontSize: typography.size.body,
    color: colors.wrong,
    textDecorationLine: 'line-through',
  },
  correct: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  muted: { fontSize: typography.size.body, color: colors.textMuted },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#E0F6F3',
  },
  badgeText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
