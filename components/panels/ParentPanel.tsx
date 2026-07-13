import { type User } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FamilySetup } from './parent/FamilySetup';
import { ParentAuthForm } from './parent/ParentAuthForm';
import { ParentDashboard } from './parent/ParentDashboard';
import { Header, IconButton, ScreenContainer } from '../ui';
import { colors, operationColors, spacing, typography } from '../../constants/design';
import { useAuthUser, useDeviceRole, useFamily } from '../../hooks';

/**
 * Signed-in parent home: a one-line greeting + the dashboard (or the Create/Join
 * setup). Everything else — the account (name/email), share codes, practice
 * mode, sign out — lives behind the gear (→ /family-settings), so the home stays
 * a clean, glanceable view like the kid home.
 */
function SignedInParent({ user }: { user: User }) {
  const { t } = useTranslation();
  const { family, loading, error, reload } = useFamily(user.uid);
  const firstName = user.displayName?.trim().split(' ')[0];

  return (
    <View style={styles.body}>
      <Text style={styles.greeting}>
        {firstName
          ? t('parent.greetingNamed', { name: firstName })
          : t('parent.greetingPlain')}
      </Text>

      {loading && !family ? (
        <ActivityIndicator color={operationColors.addition.accent} />
      ) : error ? (
        <Text style={styles.errorText}>{t('parentAuth.familyError')}</Text>
      ) : !family ? (
        <FamilySetup uid={user.uid} onReady={reload} />
      ) : (
        <ParentDashboard familyId={family.id} />
      )}
    </View>
  );
}

/**
 * Parent area. Rendered directly by the root route when the device role is
 * 'parent'. Signed-out shows the auth form (with a "continue as child" escape);
 * signed-in shows the dashboard, with a gear to Family settings.
 */
export function ParentPanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setRole } = useDeviceRole();
  const { user, initializing } = useAuthUser();
  const signedIn = !!user && !user.isAnonymous;

  let content: React.ReactNode;
  if (initializing) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={operationColors.addition.accent} />
      </View>
    );
  } else if (!signedIn) {
    // Anonymous = a leftover kid session — still "signed out" here.
    content = <ParentAuthForm onContinueAsChild={() => setRole('child')} />;
  } else {
    content = <SignedInParent user={user as User} />;
  }

  return (
    <ScreenContainer
      scroll={!signedIn}
      header={
        <Header
          title={t('parent.title')}
          right={
            // Settings gear (account, codes, mode, sign out) — only once signed in.
            signedIn ? (
              <IconButton
                name="settings-outline"
                accessibilityLabel={t('familySettings.title')}
                onPress={() => router.push('/family-settings')}
              />
            ) : undefined
          }
        />
      }
    >
      {content}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center' },
  // Signed-in home fills the screen so the dashboard's own list can scroll while
  // the greeting (and the dashboard's refresh bar) stay pinned.
  body: {
    flex: 1,
    gap: spacing.md,
  },
  greeting: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.size.body,
    color: colors.wrong,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
