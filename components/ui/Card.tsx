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
  /**
   * Accent colour for the pressed-state outline. When set, a tap clearly
   * highlights the card in this colour (helps demo recordings — iOS doesn't
   * show touches). Defaults to a neutral highlight.
   */
  pressTint?: string;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}

/** A neutral elevated surface. Tappable when `onPress` is provided. */
export function Card({
  children,
  onPress,
  pressTint,
  style,
  accessibilityLabel,
}: CardProps) {
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
          pressed && pressTint ? { borderColor: pressTint } : null,
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
  // Clearly readable on screen recordings: the card shrinks, lifts, tints, and
  // (with `pressTint`) outlines in its accent colour. Border width stays 1.5 so
  // there's no layout shift.
  pressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.textMuted,
    ...shadows.md,
  },
});
