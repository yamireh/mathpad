import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { clockColors, colors, radius, spacing, typography } from '../../../constants/design';

/** Colour key telling the kid which hand is which. */
export function ClockLegend() {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Item color={clockColors.hourHand} label={t('clock.hourHand')} />
      <Item color={clockColors.minuteHand} label={t('clock.minuteHand')} />
    </View>
  );
}

function Item({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.item}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
});
