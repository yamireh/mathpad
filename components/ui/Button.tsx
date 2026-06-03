import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

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
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
  const contentColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? tone
        : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && { backgroundColor: tone },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={contentColor} /> : null}
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
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  label: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
  },
});
