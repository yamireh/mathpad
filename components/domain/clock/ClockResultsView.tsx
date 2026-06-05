import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, ScreenContainer } from '../../ui';
import { clockColors, colors, spacing, typography } from '../../../constants/design';
import { formatDigital, type ClockResult } from '../../../lib/clock';
import { encouragementKey } from '../../../lib/scoring';

export interface ClockResultsViewProps {
  results: ClockResult[];
  onAgain: () => void;
  onHome: () => void;
}

/** Clock session score: total correct + a per-question list. */
export function ClockResultsView({
  results,
  onAgain,
  onHome,
}: ClockResultsViewProps) {
  const { t } = useTranslation();
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const encouragement = t(
    `score.encouragement.${encouragementKey(correct, total)}`,
  );

  return (
    <ScreenContainer scroll>
      <Header title={t('score.title')} />

      <Text style={styles.encouragement}>{encouragement}</Text>
      <Text style={[styles.hero, { color: clockColors.hourHand }]}>
        {t('score.value', { score: correct, total })}
      </Text>

      <View style={styles.list}>
        {results.map((r, i) => (
          <Card key={`${r.question.id}-${i}`} style={styles.row}>
            <Text style={styles.rowTime}>{formatDigital(r.question.time)}</Text>
            <Ionicons
              name={r.correct ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={r.correct ? colors.correct : colors.wrong}
            />
          </Card>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label={t('score.again')} tone={clockColors.hourHand} onPress={onAgain} />
        <Button label={t('score.home')} variant="secondary" onPress={onHome} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  encouragement: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  hero: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: typography.size.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  list: { gap: spacing.sm, marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTime: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  actions: { gap: spacing.sm, marginTop: spacing.xxl },
});
