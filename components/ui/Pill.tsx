import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../constants/design';
import { type IoniconName } from './IconButton';

export interface PillProps {
  label: string;
  onPress: () => void;
  icon?: IoniconName;
  accessibilityLabel?: string;
}

/** A rounded label-with-icon button, e.g. the Home screen's History/Settings. */
export function Pill({ label, onPress, icon, accessibilityLabel }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      {icon ? (
        <Ionicons name={icon} size={18} color={colors.text} />
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  label: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
