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

/**
 * A wide row-style topic card for the Home screen — operation badge on the
 * left, label centered, chevron on the right.
 */
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
          <Ionicons name="shuffle" size={24} color="#FFFFFF" />
        ) : (
          <Text style={styles.symbol}>{SYMBOL[operation]}</Text>
        )}
      </View>
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={accent} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 26,
    fontWeight: typography.weight.medium,
    color: '#FFFFFF',
  },
  // Stretches between the badge and the chevron so the label sits centered
  // within the available middle space regardless of label length.
  labelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
});
