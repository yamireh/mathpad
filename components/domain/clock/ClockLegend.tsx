import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  clockColors,
  colors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';

export interface ClockLegendProps {
  /** The hand a drag currently moves. */
  selected: 'hour' | 'minute';
  onSelect: (hand: 'hour' | 'minute') => void;
}

/**
 * Hand selector: tap "Hour hand" or "Minute hand" to choose which hand the
 * drag moves, so the other one never changes by accident. Doubles as the
 * colour key.
 */
export function ClockLegend({ selected, onSelect }: ClockLegendProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <HandButton
        color={clockColors.hourHand}
        label={t('clock.hourHand')}
        active={selected === 'hour'}
        onPress={() => onSelect('hour')}
      />
      <HandButton
        color={clockColors.minuteHand}
        label={t('clock.minuteHand')}
        active={selected === 'minute'}
        onPress={() => onSelect('minute')}
      />
    </View>
  );
}

function HandButton({
  color,
  label,
  active,
  onPress,
}: {
  color: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[
        styles.button,
        active ? { backgroundColor: color, borderColor: color } : null,
      ]}
    >
      <View
        style={[styles.dot, { backgroundColor: active ? '#FFFFFF' : color }]}
      />
      <Text style={[styles.label, active ? styles.labelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  label: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  labelActive: { color: '#FFFFFF' },
});
