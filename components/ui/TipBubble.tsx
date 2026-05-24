import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useTip } from '../../hooks/useTips';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/design';

export interface TipBubbleProps {
  /** Persistence id — once dismissed, this tip will not show again. */
  id: string;
  /** Tip is irrelevant unless this is true (e.g. only on empty pad). */
  when?: boolean;
  text: string;
  /** Direction of the bubble's tail. 'none' hides the pointer. */
  pointer?: 'up' | 'down' | 'none';
  /** Extra style for the wrapping View (positioning, alignment). */
  style?: ViewStyle | ViewStyle[];
}

/**
 * One-time coach mark with a "got it" dismiss button. Renders nothing once the
 * user has dismissed it (state persisted via `useTip`).
 */
export function TipBubble({
  id,
  when = true,
  text,
  pointer = 'down',
  style,
}: TipBubbleProps) {
  const { t } = useTranslation();
  const { shouldShow, markSeen } = useTip(id);
  if (!when || !shouldShow) return null;

  const pointerEl =
    pointer === 'none' ? null : (
      <View
        style={[
          styles.pointer,
          pointer === 'down' ? styles.pointerDown : styles.pointerUp,
        ]}
      />
    );

  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      {pointer === 'up' ? pointerEl : null}
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
        <Pressable
          onPress={markSeen}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.gotIt')}
          style={styles.close}
        >
          <Ionicons name="close" size={14} color={colors.surface} />
        </Pressable>
      </View>
      {pointer === 'down' ? pointerEl : null}
    </View>
  );
}

const BUBBLE_COLOR = colors.text;
const POINTER_SIZE = 8;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BUBBLE_COLOR,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
    maxWidth: 280,
    ...shadows.md,
  },
  text: {
    flexShrink: 1,
    color: colors.surface,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    fontWeight: typography.weight.medium,
  },
  close: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: POINTER_SIZE,
    borderRightWidth: POINTER_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pointerDown: {
    borderTopWidth: POINTER_SIZE,
    borderTopColor: BUBBLE_COLOR,
  },
  pointerUp: {
    borderBottomWidth: POINTER_SIZE,
    borderBottomColor: BUBBLE_COLOR,
  },
});
