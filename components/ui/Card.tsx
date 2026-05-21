import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing } from '../../constants/design';

export interface CardProps {
  children: ReactNode;
  /** Makes the whole card tappable. */
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}

/** A neutral elevated surface. Tappable when `onPress` is provided. */
export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          style as ViewStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, style as ViewStyle]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
