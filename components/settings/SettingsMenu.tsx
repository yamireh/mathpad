import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../constants/design';
import { tapFeedback } from '../../lib/feedback';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** One tappable settings row. */
export interface MenuItem {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}

function MenuRow({ icon, label, onPress }: MenuItem) {
  return (
    <Pressable
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/**
 * Presentational settings menu — renders a list of {@link MenuItem}s and nothing
 * else. Each caller (ChildMenu / ParentMenu) decides its own items, so changing
 * one menu never touches the others or this renderer.
 */
export function SettingsMenu({ items }: { items: MenuItem[] }) {
  return (
    <View style={styles.menu}>
      {items.map((item) => (
        <MenuRow key={item.label} {...item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
