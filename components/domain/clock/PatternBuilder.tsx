import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../constants/design';
import type { ClockToken, PatternSections } from '../../../lib/clock';
import { ClockTile } from './ClockTile';

export interface PatternBuilderProps {
  /** Tiles the child can pick from, grouped by their role in the phrase. */
  sections: PatternSections;
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

/**
 * "Tell the time" answer surface: tap tiles to build the spoken phrase. Tiles
 * are grouped into Minutes / Past·to·o'clock / Hour to teach the sentence frame,
 * but the answer line stays free-order so "six o'clock" reads correctly.
 */
export function PatternBuilder({
  sections,
  built,
  onAdd,
  onRemove,
}: PatternBuilderProps) {
  const { t } = useTranslation();
  const label = useTokenLabel();

  const groups: { key: string; title: string; tiles: ClockToken[] }[] = [
    { key: 'minutes', title: t('clock.sectionMinutes'), tiles: sections.minutes },
    { key: 'linkers', title: t('clock.sectionLink'), tiles: sections.linkers },
    { key: 'hours', title: t('clock.sectionHour'), tiles: sections.hours },
  ];

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
              accessibilityHint={t('clock.removeTileHint')}
              onPress={() => onRemove(i)}
            />
          ))
        )}
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.section}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <View style={styles.bank}>
            {group.tiles.map((token, i) => (
              <ClockTile
                key={`${group.key}-${i}`}
                label={label(token)}
                onPress={() => onAdd(token)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fill the available width so the answer box and tile rows don't shrink to
  // the widest section (the parent centers its children).
  root: { alignSelf: 'stretch', gap: spacing.lg },
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
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
