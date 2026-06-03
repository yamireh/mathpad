import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../ui';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';

export interface TopicCardProps {
  /** Localised topic label. */
  label: string;
  /** Localised one-line description. */
  description: string;
  /** Ionicon shown on the icon tile. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Solid accent colour (icon tile + chevron). */
  accent: string;
  /** Tinted accent colour (the "Ready" badge background). */
  tint: string;
  /** Pass `false` to swap the chevron for a "Coming soon" badge. */
  enabled?: boolean;
  /** Badge copy when enabled (already localised, e.g. "Ready"). */
  readyLabel?: string;
  /** Badge copy when disabled (already localised, e.g. "Coming soon"). */
  comingSoonLabel?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * A wide row-style card for the MainPanel topic chooser: a vibrant icon
 * tile, the topic name + a one-line description, and a status badge —
 * "Ready" (live) or "Coming soon" (placeholder modules).
 */
export function TopicCard({
  label,
  description,
  icon,
  accent,
  tint,
  enabled = true,
  readyLabel,
  comingSoonLabel,
  onPress,
  accessibilityLabel,
}: TopicCardProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.card}
    >
      <View style={[styles.tile, { backgroundColor: accent }]}>
        <Ionicons name={icon} size={30} color="#FFFFFF" />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !enabled && styles.titleMuted]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {enabled ? (
            readyLabel ? (
              <View style={[styles.badge, { backgroundColor: tint }]}>
                <Text style={[styles.badgeText, { color: accent }]}>
                  {readyLabel}
                </Text>
              </View>
            ) : null
          ) : comingSoonLabel ? (
            <View style={[styles.badge, styles.badgeSoon]}>
              <Text style={[styles.badgeText, styles.badgeSoonText]}>
                {comingSoonLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>

      {enabled ? (
        <Ionicons name="chevron-forward" size={22} color={accent} />
      ) : null}
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
  body: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  titleMuted: { color: colors.textMuted },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeSoon: { backgroundColor: colors.surfaceAlt },
  badgeText: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
  },
  badgeSoonText: { color: colors.textMuted },
  desc: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
});
