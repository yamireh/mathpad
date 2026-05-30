import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../ui';
import { colors, radius, spacing, typography } from '../../../constants/design';

export interface TopicCardProps {
  /** Localised topic label. */
  label: string;
  /** Ionicon shown on the badge. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Solid accent colour (badge + label). */
  accent: string;
  /** Tinted background colour. */
  tint: string;
  /** Pass `false` to show a "Coming soon" pill next to the chevron. */
  enabled?: boolean;
  /** Coming-soon copy (already localised). Only shown when `enabled` is false. */
  comingSoonLabel?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * A wide row-style card used on the MainPanel topic chooser. Mirrors
 * OperationCard's layout (badge / centered label / chevron) so the
 * MainPanel and OperationsPanel feel like the same family of screens.
 */
export function TopicCard({
  label,
  icon,
  accent,
  tint,
  enabled = true,
  comingSoonLabel,
  onPress,
  accessibilityLabel,
}: TopicCardProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.card, { backgroundColor: tint, borderColor: tint }]}
    >
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Ionicons name={icon} size={26} color="#FFFFFF" />
      </View>
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
        {!enabled && comingSoonLabel ? (
          <Text style={styles.comingSoon}>{comingSoonLabel}</Text>
        ) : null}
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
  labelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
  comingSoon: {
    marginTop: 2,
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
});
