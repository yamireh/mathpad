import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { QuestionResultRow } from '../components/domain';
import { Button, Card, Header, ScreenContainer } from '../components/ui';
import {
  colors,
  operationColors,
  spacing,
  typography,
} from '../constants/design';
import { usePracticeSession } from '../hooks';
import { countFinal, countFirstTry, encouragementKey } from '../lib/scoring';

/** Score — first-try and final scores, encouragement, the question list. */
export default function ScoreScreen() {
  const { session, start, reset } = usePracticeSession();
  const router = useRouter();
  const { t } = useTranslation();

  if (!session || !session.results) return <Redirect href="/" />;

  const results = session.results;
  const total = results.length;
  const firstTry = countFirstTry(results);
  const final = countFinal(results);
  const accent = operationColors[session.settings.operation].accent;
  const encouragement = t(
    `score.encouragement.${encouragementKey(final, total)}`,
  );

  const goHome = () => {
    reset();
    router.dismissAll();
  };
  const playAgain = () => {
    start(session.settings);
    router.replace('/practice');
  };

  return (
    <ScreenContainer scroll>
      <Header title={t('score.title')} />

      <Text style={styles.encouragement}>{encouragement}</Text>

      <View style={styles.stats}>
        <Stat label={t('score.firstTry')} score={firstTry} total={total} />
        <Stat
          label={t('score.final')}
          score={final}
          total={total}
          tone={accent}
        />
      </View>

      <Text style={styles.listTitle}>{t('score.answersTitle')}</Text>
      <View style={styles.list}>
        {results.map((result, i) => (
          <QuestionResultRow
            key={result.question.id}
            result={result}
            number={i + 1}
            onPress={() => router.push(`/review/${i}`)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={t('score.again')}
          tone={accent}
          onPress={playAgain}
        />
        <Button
          label={t('score.home')}
          variant="secondary"
          onPress={goHome}
        />
      </View>
    </ScreenContainer>
  );
}

function Stat({
  label,
  score,
  total,
  tone,
}: {
  label: string;
  score: number;
  total: number;
  tone?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>
        {t('score.value', { score, total })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  encouragement: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statLabel: {
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  listTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  list: { gap: spacing.sm },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
});
