import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/design';
import { type IoniconName } from './IconButton';

export interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: IoniconName;
}

/** Centred placeholder shown when a list or screen has no content. */
export function EmptyState({ title, hint, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? (
        <Ionicons name={icon} size={48} color={colors.textMuted} />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
