import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '../../constants/design';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface IconButtonProps {
  name: IoniconName;
  onPress: () => void;
  /** Required for VoiceOver — icon buttons have no visible label. */
  accessibilityLabel: string;
  size?: number;
  color?: string;
  disabled?: boolean;
}

/** A square 44pt-minimum tappable icon. */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 24,
  color = colors.text,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.55 },
  disabled: { opacity: 0.35 },
});
