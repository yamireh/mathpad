import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/design';
import { type IoniconName } from './IconButton';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Accent colour — fills `primary`, tints text on `ghost`. */
  tone?: string;
  /** Optional leading icon. */
  icon?: IoniconName;
  disabled?: boolean;
  /** Show a spinner in place of the icon and block presses (e.g. mid-purchase). */
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

/** Primary tappable action. Large tap target, design-token styled. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  tone = colors.text,
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
  const contentColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? tone
        : colors.text;
  // A loading button is inert — it must not fire again while its action runs.
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && { backgroundColor: tone },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !blocked && styles.pressed,
        blocked && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={contentColor} />
      ) : null}
      <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fullWidth: { alignSelf: 'stretch' },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  // Clearly readable on screen recordings: the button visibly pushes in on tap
  // (same scale as the cards), consistent across the app.
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  label: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
  },
});
