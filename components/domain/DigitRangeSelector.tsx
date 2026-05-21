import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '../ui';
import { colors, spacing, typography } from '../../constants/design';
import type { DigitCount, DigitRange } from '../../types';

export interface DigitRangeSelectorProps {
  value: DigitRange;
  onChange: (range: DigitRange) => void;
  /** Localised "From" / "To" labels. */
  fromLabel: string;
  toLabel: string;
  tone?: string;
}

const CHOICES: DigitCount[] = [1, 2, 3, 4];

/**
 * Picks an inclusive digit-count range from {1,2,3,4}. The minimum and maximum
 * are kept consistent — raising one past the other drags the other along.
 */
export function DigitRangeSelector({
  value,
  onChange,
  fromLabel,
  toLabel,
  tone = colors.text,
}: DigitRangeSelectorProps) {
  const setMin = (min: DigitCount) => {
    onChange({ min, max: min > value.max ? min : value.max });
  };
  const setMax = (max: DigitCount) => {
    onChange({ min: max < value.min ? max : value.min, max });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{fromLabel}</Text>
        <View style={styles.chips}>
          {CHOICES.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={value.min === n}
              onPress={() => setMin(n)}
              tone={tone}
            />
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{toLabel}</Text>
        <View style={styles.chips}>
          {CHOICES.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={value.max === n}
              onPress={() => setMax(n)}
              tone={tone}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: {
    width: 52,
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
  chips: { flexDirection: 'row', gap: spacing.sm, flex: 1 },
});
