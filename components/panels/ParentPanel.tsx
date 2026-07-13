import { type User } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FamilyCode } from './parent/FamilyCode';
import { ParentAuthForm } from './parent/ParentAuthForm';
import { ParentDashboard } from './parent/ParentDashboard';
import { Button, Header, ScreenContainer } from '../ui';
import { colors, operationColors, spacing, typography } from '../../constants/design';
import { useAuthUser, useDeviceRole, useFamily } from '../../hooks';
import { signOut } from '../../lib/firebase/auth';

/** Signed-in parent: their family's progress dashboard + pairing code. */
function SignedInParent({ user }: { user: User }) {
  const { t } = useTranslation();
  const { family, loading, error } = useFamily(user.uid);
  const [showCode, setShowCode] = useState(false);

  if (loading && !family) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={operationColors.addition.accent} />
      </View>
    );
  }
  if (error || !family) {
    return <Text style={styles.errorText}>{t('parentAuth.familyError')}</Text>;
  }
  return (
    <View style={styles.body}>
      <Text style={styles.signedIn}>
        {t('parentAuth.signedInAs', { email: user.email ?? '' })}
      </Text>
      <ParentDashboard familyId={family.id} />
      {showCode ? <FamilyCode code={family.pairingCode} /> : null}
      <View style={styles.action}>
        <Button
          label={t(showCode ? 'parentAuth.hideCode' : 'parentAuth.addMember')}
          icon="qr-code-outline"
          variant="secondary"
          onPress={() => setShowCode((s) => !s)}
          fullWidth
        />
        <Button
          label={t('parentAuth.signOut')}
          icon="log-out-outline"
          variant="ghost"
          onPress={() => void signOut()}
          fullWidth
        />
      </View>
    </View>
  );
}

/**
 * Parent area. Rendered directly by the root route when the device role is
 * 'parent'. Signed-out shows the auth form (with a "continue as child" escape);
 * signed-in shows the dashboard + pairing code.
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
    // Anonymous = a leftover kid session — still "signed out" here.
    content = <ParentAuthForm onContinueAsChild={() => setRole('child')} />;
  } else {
    content = <SignedInParent user={user} />;
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  signedIn: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.size.body,
    color: colors.wrong,
    textAlign: 'center',
    padding: spacing.xl,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
