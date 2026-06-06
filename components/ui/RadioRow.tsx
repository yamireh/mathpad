import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/design';

export interface RadioRowProps {
  label: string;
  /** Optional one-line explanation under the label. */
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Accent colour for the selected indicator. */
  tone?: string;
}

/** One selectable row within a radio group. */
export function RadioRow({
  label,
  description,
  selected,
  onPress,
  tone = colors.text,
}: RadioRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.dot,
          { borderColor: selected ? tone : colors.border },
        ]}
      >
        {selected ? (
          <View style={[styles.dotInner, { backgroundColor: tone }]} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  texts: { flex: 1, gap: 2, paddingRight: spacing.md },
  label: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.regular,
    color: colors.text,
  },
  description: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
  },
});
