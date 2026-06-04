import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../ui';
import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';
import type { Operation } from '../../types';

export interface OperationCardProps {
  operation: Operation;
  /** Localised operation name. */
  label: string;
  /** Localised one-line description. */
  description: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Paid operation that isn't unlocked yet — shows a lock instead of a chevron. */
  locked?: boolean;
}

/** Symbol shown on the badge for each operation. */
const SYMBOL: Record<Exclude<Operation, 'mix'>, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

/**
 * A wide row-style operation card: a vibrant accent tile (the operation's
 * symbol, or a shuffle glyph for Mix), the operation name + a one-line
 * description, and a chevron.
 */
export function OperationCard({
  operation,
  label,
  description,
  onPress,
  accessibilityLabel,
  locked = false,
}: OperationCardProps) {
  const accent = operationColors[operation].accent;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.card}
    >
      <View style={[styles.tile, { backgroundColor: accent }]}>
        {operation === 'mix' ? (
          <Ionicons name="shuffle" size={26} color="#FFFFFF" />
        ) : (
          <Text style={styles.symbol}>{SYMBOL[operation]}</Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: accent }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>

      <Ionicons
        name={locked ? 'lock-closed' : 'chevron-forward'}
        size={locked ? 20 : 22}
        color={locked ? colors.textMuted : accent}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 0,
    ...shadows.md,
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  symbol: {
    fontSize: 28,
    fontWeight: typography.weight.medium,
    color: '#FFFFFF',
  },
  body: { flex: 1, gap: 3 },
  label: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
  },
  desc: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
});
