import { Pressable, StyleSheet, Text } from 'react-native';

import {
  clockColors,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';

export interface ClockTileProps {
  label: string;
  onPress: () => void;
  /** `bank` = a selectable option; `answer` = already placed in the answer line. */
  variant?: 'bank' | 'answer';
  accessibilityLabel?: string;
}

/** A single tappable word/number tile for the pattern builder. */
export function ClockTile({
  label,
  onPress,
  variant = 'bank',
  accessibilityLabel,
}: ClockTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.tile,
        variant === 'answer' ? styles.answer : styles.bank,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, variant === 'answer' && styles.answerLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minWidth: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bank: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  answer: { backgroundColor: clockColors.hourHand },
  pressed: { opacity: 0.7 },
  label: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  answerLabel: { color: '#FFFFFF' },
});
