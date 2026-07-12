import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Header, ScreenContainer } from '../ui';
import { colors, operationColors, spacing, typography } from '../../constants/design';
import { useDeviceRole } from '../../hooks';

/**
 * Parent area — placeholder home. The account/sign-in flow + progress dashboard
 * land here in the next milestones. Rendered directly by the root route when the
 * device role is 'parent' (not via navigation), so changing the role reactively
 * swaps back to the kid home. Also offers escape hatches: switch this device to
 * child mode, or re-show the first-run picker.
 */
export function ParentPanel() {
  const { t } = useTranslation();
  const { setRole } = useDeviceRole();
  return (
    <ScreenContainer>
      <Header title={t('parent.title')} />
      <View style={styles.body}>
        <Ionicons
          name="people-circle-outline"
          size={64}
          color={operationColors.addition.accent}
        />
        <Text style={styles.headline}>{t('parent.comingSoonTitle')}</Text>
        <Text style={styles.text}>{t('parent.comingSoonBody')}</Text>
        <View style={styles.action}>
          <Button
            label={t('parent.switchToChild')}
            icon="swap-horizontal-outline"
            variant="secondary"
            onPress={() => setRole('child')}
            fullWidth
          />
          <Button
            label={t('parent.askAgain')}
            icon="refresh-outline"
            variant="ghost"
            onPress={() => setRole('unset')}
            fullWidth
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  headline: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
