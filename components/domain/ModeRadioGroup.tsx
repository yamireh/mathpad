import { StyleSheet, View } from 'react-native';

import { RadioRow } from '../ui';
import { colors } from '../../constants/design';

export interface ModeOptionItem<T extends string> {
  value: T;
  label: string;
}

export interface ModeRadioGroupProps<T extends string> {
  options: ModeOptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: string;
}

/** A vertical radio group — used for every With/Without/Random style setting. */
export function ModeRadioGroup<T extends string>({
  options,
  value,
  onChange,
  tone = colors.text,
}: ModeRadioGroupProps<T>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {options.map((option) => (
        <RadioRow
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          tone={tone}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { width: '100%' },
});
