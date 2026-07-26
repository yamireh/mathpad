/**
 * Parent-mode design kit — the shared building blocks every parent surface
 * (Progress / Goals / Practice) is built from, so they look like one app and
 * new screens stay consistent for free.
 *
 *  - `childColor(index)` — the ONE per-child accent palette (avatars, accents).
 *  - `Avatar`   — a colored initial circle for a child.
 *  - `StatBadge`— a soft rounded stat (icon + value + caption).
 *  - `TopicPill`— a small colored label pill.
 *  - `InfoRow`  — a tappable "label … value ›" list row.
 */
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { type IoniconName } from '../../ui';

/** One vivid, high-contrast accent per child, cycled by index. */
const CHILD_COLORS = [
  '#2563EB', // blue
  '#DB2777', // pink
  '#16A34A', // green
  '#D97706', // amber
  '#7C3AED', // purple
  '#0891B2', // cyan
];

export function childColor(index: number): string {
  return CHILD_COLORS[index % CHILD_COLORS.length];
}

/** A colored circle with the child's initial. */
export function Avatar({
  name,
  index,
  size = 40,
}: {
  name: string;
  index: number;
  size?: number;
}) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: childColor(index),
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.42) }]}>
        {initial}
      </Text>
    </View>
  );
}

/** A soft rounded stat tile: icon over a big value over a caption. */
export function StatBadge({
  icon,
  iconColor,
  value,
  valueColor,
  caption,
  background,
  style,
}: {
  icon?: IoniconName;
  iconColor?: string;
  value: string | number;
  valueColor?: string;
  caption: string;
  background?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.badge, background ? { backgroundColor: background } : null, style]}>
      {icon ? <Ionicons name={icon} size={20} color={iconColor ?? colors.text} /> : null}
      <Text style={[styles.badgeValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      <Text style={styles.badgeCaption}>{caption}</Text>
    </View>
  );
}

/** A small colored label pill (e.g. a topic). */
export function TopicPill({ label, tint, color }: { label: string; tint: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: tint }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** A list row: leading content, a value, and (when tappable) a chevron. */
export function InfoRow({
  children,
  value,
  valueColor,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  value?: ReactNode;
  valueColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <>
      <View style={styles.rowLeft}>{children}</View>
      <View style={styles.rowRight}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>
            {value}
          </Text>
        ) : (
          value
        )}
        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </View>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

/** Section-heading label used above grouped content. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  avatarText: { color: '#FFFFFF', fontWeight: typography.weight.medium },
  badge: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  badgeValue: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  badgeCaption: { fontSize: typography.size.caption, color: colors.textMuted },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pillText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowValue: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
});
