import { StyleSheet, View } from 'react-native';

import { Button } from '../../ui';
import { spacing } from '../../../constants/design';

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accent for the selected segment. */
  tone?: string;
}

/** A single-select row of equal-width buttons. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone,
}: SegmentedProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => (
        <View key={o.value} style={styles.flex}>
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
  flex: { flex: 1 },
});
