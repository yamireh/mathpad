import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, operationColors, spacing, typography } from '../../constants/design';
import { useDeviceRole } from '../../hooks';
import { Button } from '../ui';

/**
 * First-run overlay: "Whose device is this?" Sets the device role once so a
 * kid's device goes straight to practice and a parent's device routes to the
 * parent area. Shown only while the role is `'unset'`; the choice is reversible
 * later from Settings.
 */
export function RolePickerGate() {
  const { t } = useTranslation();
  const { setRole } = useDeviceRole();
  return (
    <View style={styles.overlay}>
      <Ionicons
        name="people-circle-outline"
        size={64}
        color={operationColors.addition.accent}
      />
      <Text style={styles.title}>{t('deviceRole.title')}</Text>
      <Text style={styles.body}>{t('deviceRole.body')}</Text>
      <View style={styles.actions}>
        <Button
          label={t('deviceRole.child')}
          icon="happy-outline"
          onPress={() => setRole('child')}
          tone={operationColors.addition.accent}
          fullWidth
        />
        <Button
          label={t('deviceRole.parent')}
          icon="person-outline"
          variant="secondary"
          onPress={() => setRole('parent')}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
