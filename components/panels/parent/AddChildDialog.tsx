/**
 * AddChildDialog — create a child profile in the family (Parent Pro Phase 1).
 * A child is a family entity the parent can practice as / assign practice to.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../ui';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';

export interface AddChildDialogProps {
  visible: boolean;
  onAdd: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

export function AddChildDialog({ visible, onAdd, onCancel }: AddChildDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAdd(name.trim());
      setName('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>{t('dashboard.addChildTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('dashboard.childNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
          />
          <View style={styles.actions}>
            <Button
              label={t('dashboard.add')}
              variant="primary"
              disabled={!name.trim() || busy}
              loading={busy}
              onPress={() => void add()}
            />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              disabled={busy}
              onPress={onCancel}
            />
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
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.regular,
    letterSpacing: 0,
    color: colors.text,
  },
  actions: { gap: spacing.sm },
});
