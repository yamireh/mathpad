import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../constants/design';
import { tapFeedback } from '../../lib/feedback';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface ActionSheetItem {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  /** Renders in the destructive (red) tone, e.g. Remove. */
  destructive?: boolean;
}

/**
 * A bottom action sheet — the scalable home for a row's overflow actions (the
 * "⋯" menu). Add items freely; the sheet stacks them instead of cramming a row
 * of buttons (which truncate). Tapping an item runs it and closes the sheet.
 */
export function ActionSheet({
  visible,
  title,
  items,
  onClose,
}: {
  visible: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Absorb taps inside the sheet so they don't dismiss it. */}
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                tapFeedback();
                onClose();
                item.onPress();
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.destructive ? colors.wrong : colors.text}
              />
              <Text style={[styles.itemLabel, item.destructive && styles.destructive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  itemLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  destructive: { color: colors.wrong },
  cancel: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
});
