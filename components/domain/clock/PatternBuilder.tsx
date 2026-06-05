import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../constants/design';
import type { ClockToken } from '../../../lib/clock';
import { ClockTile } from './ClockTile';

export interface PatternBuilderProps {
  /** Tiles the child can pick from (correct tokens + decoys). */
  bank: ClockToken[];
  /** Tokens placed so far, in order. */
  built: ClockToken[];
  /** Append a tile to the answer line. */
  onAdd: (token: ClockToken) => void;
  /** Remove the token at `index` from the answer line. */
  onRemove: (index: number) => void;
}

/** Render a token's label (words are localized; numbers show as digits). */
function useTokenLabel() {
  const { t } = useTranslation();
  return (token: ClockToken) =>
    token.kind === 'word' ? t(`clock.words.${token.word}`) : String(token.value);
}

/** "Tell the time" answer surface: tap tiles to build the spoken phrase. */
export function PatternBuilder({
  bank,
  built,
  onAdd,
  onRemove,
}: PatternBuilderProps) {
  const { t } = useTranslation();
  const label = useTokenLabel();

  return (
    <View style={styles.root}>
      <View style={styles.answer}>
        {built.length === 0 ? (
          <Text style={styles.hint}>{t('clock.patternHint')}</Text>
        ) : (
          built.map((token, i) => (
            <ClockTile
              key={`built-${i}`}
              label={label(token)}
              variant="answer"
              onPress={() => onRemove(i)}
            />
          ))
        )}
      </View>

      <View style={styles.bank}>
        {bank.map((token, i) => (
          <ClockTile
            key={`bank-${i}`}
            label={label(token)}
            onPress={() => onAdd(token)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  answer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  hint: {
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
