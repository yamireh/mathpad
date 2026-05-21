import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/design';

export interface TimerDisplayProps {
  /** Seconds left in the session. */
  secondsRemaining: number;
}

/** Seconds below which the timer turns coral. */
const WARNING_THRESHOLD = 30;

/** Format a second count as `M:SS`. */
function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Compact session countdown for the Practice top bar. */
export function TimerDisplay({ secondsRemaining }: TimerDisplayProps) {
  const warning = secondsRemaining <= WARNING_THRESHOLD;
  const tint = warning ? colors.wrong : colors.text;
  const clock = formatClock(secondsRemaining);

  return (
    <View
      style={[styles.pill, warning && styles.pillWarning]}
      accessibilityRole="timer"
      accessibilityLabel={clock}
    >
      <Ionicons name="time-outline" size={16} color={tint} />
      <Text style={[styles.text, { color: tint }]}>{clock}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  pillWarning: { backgroundColor: '#FFEAE7' },
  text: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
});
