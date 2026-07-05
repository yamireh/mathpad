import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../constants/design';
import { Button } from './Button';

export interface NoticeDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** The single dismiss button's label (e.g. "Got it"). */
  buttonLabel: string;
  onDismiss: () => void;
}

/**
 * A light, single-button notice. Like {@link ConfirmDialog} but with one
 * acknowledge action and no choice — used to tell the kid something and get
 * them back on task (e.g. "couldn't read that — try again").
 */
export function NoticeDialog({
  visible,
  title,
  message,
  buttonLabel,
  onDismiss,
}: NoticeDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={styles.dialog}
          accessibilityViewIsModal
          accessibilityLabel={title}
        >
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button label={buttonLabel} variant="primary" onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  message: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.body,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
