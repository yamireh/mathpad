import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../ui';
import { operationColors, radius, spacing, typography } from '../../constants/design';
import type { Operation } from '../../types';

export interface OperationCardProps {
  operation: Operation;
  /** Localised operation name. */
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** Symbol shown on the badge for each operation. */
const SYMBOL: Record<Exclude<Operation, 'mix'>, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

/** A large tappable topic card for the Home screen. */
export function OperationCard({
  operation,
  label,
  onPress,
  accessibilityLabel,
}: OperationCardProps) {
  const accent = operationColors[operation].accent;
  const tint = operationColors[operation].tint;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.card, { backgroundColor: tint, borderColor: tint }]}
    >
      <View style={[styles.badge, { backgroundColor: accent }]}>
        {operation === 'mix' ? (
          <Ionicons name="shuffle" size={28} color="#FFFFFF" />
        ) : (
          <Text style={styles.symbol}>{SYMBOL[operation]}</Text>
        )}
      </View>
      <Text style={[styles.label, { color: accent }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 30,
    fontWeight: typography.weight.medium,
    color: '#FFFFFF',
  },
  label: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
});
