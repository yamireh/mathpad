import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ParentAuthForm } from './parent/ParentAuthForm';
import { Button, Header, ScreenContainer } from '../ui';
import { colors, operationColors, spacing, typography } from '../../constants/design';
import { useAuthUser, useDeviceRole } from '../../hooks';
import { signOut } from '../../lib/firebase/auth';

/**
 * Parent area. Rendered directly by the root route when the device role is
 * 'parent' (not via navigation), so role changes reactively swap back to the
 * kid home. Signed-out shows the auth form (with a "continue as child" escape);
 * signed-in shows a (placeholder) dashboard.
 */
export function ParentPanel() {
  const { t } = useTranslation();
  const { setRole } = useDeviceRole();
  const { user, initializing } = useAuthUser();

  let content: React.ReactNode;
  if (initializing) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={operationColors.addition.accent} />
      </View>
    );
  } else if (!user || user.isAnonymous) {
    // Anonymous = a leftover kid/health-check session — still "signed out" here.
    content = <ParentAuthForm onContinueAsChild={() => setRole('child')} />;
  } else {
    content = (
      <View style={styles.body}>
        <Ionicons name="checkmark-circle" size={72} color={colors.correct} />
        <Text style={styles.headline}>
          {t('parentAuth.signedInAs', { email: user.email ?? '' })}
        </Text>
        <Text style={styles.text}>{t('parentAuth.dashboardSoon')}</Text>
        <View style={styles.action}>
          <Button
            label={t('parentAuth.signOut')}
            icon="log-out-outline"
            variant="secondary"
            onPress={() => void signOut()}
            fullWidth
          />
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer scroll header={<Header title={t('parent.title')} />}>
      {content}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center' },
  body: {
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
  },
});
