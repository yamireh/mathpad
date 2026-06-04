import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';

export interface HintBannerProps {
  /** The (already localised) hint message. */
  message: string;
  /** Operation accent — tints the bulb + the left stripe. */
  tone: string;
  /** Dismiss-button label (already localised). */
  dismissLabel: string;
  onDismiss: () => void;
}

/** A soft, dismissible banner that shows the current practice hint. */
export function HintBanner({
  message,
  tone,
  dismissLabel,
  onDismiss,
}: HintBannerProps) {
  return (
    <View style={[styles.banner, { borderLeftColor: tone }]}>
      <Ionicons name="bulb" size={20} color={tone} />
      <Text style={styles.text}>{message}</Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  text: {
    flex: 1,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    color: colors.text,
  },
});
