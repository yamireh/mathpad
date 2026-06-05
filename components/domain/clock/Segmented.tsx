import { StyleSheet, View } from 'react-native';

import { Button } from '../../ui';
import { spacing } from '../../../constants/design';

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accent for the selected segment. */
  tone?: string;
  /** Wrap into this many columns (e.g. 2 → a 2×2 grid). Default: one row. */
  columns?: number;
}

/** A single-select set of equal-width buttons (one row, or an N-column grid). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone,
  columns,
}: SegmentedProps<T>) {
  const itemStyle = columns
    ? { flexGrow: 1, flexBasis: `${Math.floor(100 / columns) - 4}%` as const }
    : styles.flex;
  return (
    <View style={[styles.row, columns ? styles.wrap : null]}>
      {options.map((o) => (
        <View key={o.value} style={itemStyle}>
          <Button
            label={o.label}
            variant={o.value === value ? 'primary' : 'secondary'}
            tone={tone}
            onPress={() => onChange(o.value)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
  flex: { flex: 1 },
});
