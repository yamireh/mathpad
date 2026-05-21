import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';

export interface HeaderProps {
  title?: string;
  /** Leading slot — typically a back or close IconButton. */
  left?: ReactNode;
  /** Trailing slot — typically a help IconButton. */
  right?: ReactNode;
}

/** Screen header: a centred title flanked by optional action slots. */
export function Header({ title, left, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>{left}</View>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title ?? ''}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: spacing.sm,
  },
  side: { minWidth: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
