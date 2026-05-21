import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { QuestionResultRow } from '../../components/domain';
import {
  EmptyState,
  Header,
  IconButton,
  ScreenContainer,
} from '../../components/ui';
import { colors, spacing, typography } from '../../constants/design';
import { useHistory } from '../../hooks';

/** History detail — every question of a past session (digits only, no ink). */
export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { sessions, loading } = useHistory();

  const back = (
    <IconButton
      name="arrow-back"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
    />
  );

  const session = sessions?.find((s) => s.id === id);

  if (loading) {
    return (
      <ScreenContainer>
        <Header title={t('history.detailTitle')} left={back} />
      </ScreenContainer>
    );
  }

  if (!session) {
    return (
      <ScreenContainer>
        <Header title={t('history.detailTitle')} left={back} />
        <EmptyState icon="alert-circle-outline" title={t('history.empty')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Header title={t('history.detailTitle')} left={back} />

      <View style={styles.summary}>
        <Text style={styles.operation}>
          {t(`operations.${session.operation}`)}
        </Text>
        <Text style={styles.scores}>
          {t('history.firstTry', {
            score: session.firstTryScore,
            total: session.totalQuestions,
          })}
          {'   ·   '}
          {t('history.final', {
            score: session.finalScore,
            total: session.totalQuestions,
          })}
        </Text>
      </View>

      <View style={styles.list}>
        {session.questions.map((result, i) => (
          <QuestionResultRow
            key={result.question.id}
            result={result}
            number={i + 1}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: spacing.sm, marginBottom: spacing.lg, gap: spacing.xs },
  operation: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  scores: { fontSize: typography.size.body, color: colors.textMuted },
  list: { gap: spacing.sm },
});
