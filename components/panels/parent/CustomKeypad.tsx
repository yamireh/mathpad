/**
 * CustomKeypad — an in-app number grid + operators for entering custom practice
 * problems, so the parent never touches the system keyboard. A read-only display
 * shows what's typed (one problem per line); the grid appends digits/operators,
 * backspaces, and adds new lines.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';

/** Key grid — 4 columns. `⌫` backspaces, `↵` adds a line, rest append. */
const ROWS: string[][] = [
  ['1', '2', '3', '+'],
  ['4', '5', '6', '-'],
  ['7', '8', '9', '×'],
  ['⌫', '0', '↵', '÷'],
];

export interface CustomKeypadProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CustomKeypad({ value, onChange, placeholder }: CustomKeypadProps) {
  const { t } = useTranslation();

  const press = (k: string) => {
    if (k === '⌫') onChange(value.slice(0, -1));
    else if (k === '↵') onChange(value + '\n');
    else onChange(value + k);
  };

  const label = (k: string) =>
    k === '⌫' ? t('exams.opDelete') : k === '↵' ? t('exams.opNewLine') : k;

  return (
    <View style={styles.wrap}>
      <ScrollView style={styles.display} contentContainerStyle={styles.displayContent}>
        {value ? (
          <Text style={styles.value}>{value}</Text>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
      </ScrollView>

      <View style={styles.grid}>
        {ROWS.map((row) => (
          <View key={row.join('')} style={styles.row}>
            {row.map((k) => (
              <Pressable
                key={k}
                onPress={() => press(k)}
                accessibilityRole="button"
                accessibilityLabel={label(k)}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                <Text style={styles.keyText}>{k}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  display: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    maxHeight: 110,
    minHeight: 64,
  },
  displayContent: { padding: spacing.md },
  value: {
    fontSize: typography.size.bodyLarge,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    lineHeight: typography.lineHeight.bodyLarge,
  },
  placeholder: {
    fontSize: typography.size.bodyLarge,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  key: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  keyPressed: { opacity: 0.6 },
  keyText: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
