import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/design';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Accent colour — fills `primary`, tints text on `ghost`. */
  tone?: string;
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
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
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
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'ghost' && { color: tone },
        ]}
      >
        {label}
      </Text>
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
  labelPrimary: { color: '#FFFFFF' },
  labelSecondary: { color: colors.text },
});
