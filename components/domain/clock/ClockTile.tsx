import { Ionicons } from '@expo/vector-icons';
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
  accessibilityHint?: string;
}

/** A single tappable word/number tile for the pattern builder. */
export function ClockTile({
  label,
  onPress,
  variant = 'bank',
  accessibilityLabel,
  accessibilityHint,
}: ClockTileProps) {
  const isAnswer = variant === 'answer';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.tile,
        isAnswer ? styles.answer : styles.bank,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isAnswer && styles.answerLabel]}>{label}</Text>
      {/* A placed tile shows a × so it's obvious it's removable (tapping the
          tile removes it). */}
      {isAnswer ? (
        <Ionicons name="close" size={16} color="#FFFFFF" style={styles.close} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minWidth: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
  close: { marginRight: -2, opacity: 0.9 },
});
