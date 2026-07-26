import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';

export interface HowToIntroScrimProps {
  /** "Watch now" label. */
  watchLabel: string;
  /** "Don't show again" label. */
  dontShowLabel: string;
  /** Accent for the play badge. */
  tone: string;
  onWatch: () => void;
  onDontShow: () => void;
}

/**
 * First-open intro veil: dims the whole how-to page and floats a bright,
 * inviting "Watch now" button (with a smaller "Don't show again" beneath it),
 * so a first-time user's next step is obvious. Blocks touches behind it.
 */
export function HowToIntroScrim({
  watchLabel,
  dontShowLabel,
  tone,
  onWatch,
  onDontShow,
}: HowToIntroScrimProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.scrim} />
      <View style={styles.center}>
        <Pressable
          onPress={onWatch}
          accessibilityRole="button"
          accessibilityLabel={watchLabel}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <View style={[styles.play, { backgroundColor: tone }]}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaText}>{watchLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onDontShow}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.dontShow}
        >
          <Text style={styles.dontShowText}>{dontShowLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,32,0.62)' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xl,
    paddingVertical: spacing.sm,
    ...shadows.lg,
  },
  ctaPressed: { transform: [{ scale: 0.97 }], opacity: 0.95 },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3, // optically centre the triangle
  },
  ctaText: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  dontShow: { paddingVertical: spacing.xs },
  dontShowText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: 'rgba(255,255,255,0.82)',
  },
});
