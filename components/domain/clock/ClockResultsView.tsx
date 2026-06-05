import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, ScreenContainer } from '../../ui';
import { clockColors, colors, radius, spacing, typography } from '../../../constants/design';
import { formatDigital, type ClockResult } from '../../../lib/clock';
import { encouragementKey } from '../../../lib/scoring';

export interface ClockResultsViewProps {
  results: ClockResult[];
  onAgain: () => void;
  onHome: () => void;
  /** Open the fix flow for the question at `index`. */
  onFix: (index: number) => void;
}

/** Clock session score + a per-question list you can tap to fix. */
export function ClockResultsView({
  results,
  onAgain,
  onHome,
  onFix,
}: ClockResultsViewProps) {
  const { t } = useTranslation();
  const solved = results.filter((r) => r.correct || r.fixed).length;
  const total = results.length;
  const encouragement = t(
    `score.encouragement.${encouragementKey(solved, total)}`,
  );

  return (
    <ScreenContainer scroll>
      <Header title={t('score.title')} />

      <Text style={styles.encouragement}>{encouragement}</Text>
      <Text style={[styles.hero, { color: clockColors.hourHand }]}>
        {t('score.value', { score: solved, total })}
      </Text>
      <Text style={styles.tagline}>{t('review.hint')}</Text>

      <View style={styles.list}>
        {results.map((r, i) => (
          <ResultRow
            key={`${r.question.id}-${i}`}
            number={i + 1}
            result={r}
            onPress={() => onFix(i)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button label={t('score.again')} tone={clockColors.hourHand} onPress={onAgain} />
        <Button label={t('score.home')} variant="secondary" onPress={onHome} />
      </View>
    </ScreenContainer>
  );
}

function ResultRow({
  number,
  result,
  onPress,
}: {
  number: number;
  result: ClockResult;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const ok = result.correct || result.fixed;
  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowNum}>
          {t('score.questionLabel', { number })}
        </Text>
        <Text style={styles.rowTime}>{formatDigital(result.question.time)}</Text>
        {!ok ? (
          <Text style={styles.given}>
            {t('score.yourAnswer')}: {result.given}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        {result.fixed ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t('score.fixedBadge')}</Text>
          </View>
        ) : null}
        <Ionicons
          name={ok ? 'checkmark-circle' : 'close-circle'}
          size={26}
          color={ok ? colors.correct : colors.wrong}
        />
      </View>
    </Card>
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
  tagline: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  list: { gap: spacing.sm, marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { gap: 2 },
  rowNum: { fontSize: typography.size.caption, color: colors.textMuted },
  rowTime: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  given: { fontSize: typography.size.caption, color: colors.wrong },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  actions: { gap: spacing.sm, marginTop: spacing.xxl },
});
