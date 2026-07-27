import { type User } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { setFamilySubscription } from '../../lib/firebase/family';

import { FamilySetup } from './parent/FamilySetup';
import { ParentAuthForm } from './parent/ParentAuthForm';
import { ParentDashboard } from './parent/ParentDashboard';
import { ParentProPaywall } from './parent/ParentProPaywall';
import { Header, IconButton, ScreenContainer } from '../ui';
import { colors, operationColors, spacing, typography } from '../../constants/design';
import {
  useAuthUser,
  useDeviceRole,
  useFamily,
  useFamilyProActive,
  usePurchases,
} from '../../hooks';
import { PARENT_PRO_ENABLED } from '../../lib/featureFlags';

/**
 * Signed-in parent home: a one-line greeting + the dashboard (or the Create/Join
 * setup). Everything else — the account (name/email), share codes, practice
 * mode, sign out — lives behind the gear (→ /family-settings), so the home stays
 * a clean, glanceable view like the kid home.
 */
function SignedInParent({ user }: { user: User }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { family, loading, error, reload } = useFamily(user.uid);
  const { parentProActive } = usePurchases();
  // Live subscription state for THIS parent's family (not the one-shot read on
  // `family`), so toggling Pro reflects without an app restart.
  const familySubActive = useFamilyProActive(family?.id ?? null);
  const firstName = user.displayName?.trim().split(' ')[0];

  // Parent mode is subscription-gated. A parent is in ⟺ their own Pro is active
  // OR the family already carries an active subscription (co-parent inherits).
  const gated = PARENT_PRO_ENABLED && !(parentProActive || familySubActive);

  // Mirror this parent's Pro state onto the family doc so co-parents and kid
  // devices inherit access (§0.1). Stand-in for the Cloud Function. ONLY the
  // family owner writes it — a co-parent must never clobber the mirror — and
  // only when the value actually changes (compared against the LIVE state).
  useEffect(() => {
    if (!family || family.ownerUid !== user.uid) return;
    if (familySubActive === parentProActive) return;
    void setFamilySubscription(family.id, {
      active: parentProActive,
      expiresAt: null,
    });
  }, [family, parentProActive, familySubActive, user.uid]);

  return (
    <ScreenContainer
      header={
        <Header
          title={t('parent.title')}
          right={
            // Settings (account, codes, mode, sign out) — hidden on the locked
            // paywall so it can't be used to slip past the subscription.
            gated ? undefined : (
              <IconButton
                name="settings-outline"
                accessibilityLabel={t('familySettings.title')}
                onPress={() => router.push('/family-settings')}
              />
            )
          }
        />
      }
    >
      <View style={styles.body}>
        {!gated ? (
          <Text style={styles.greeting}>
            {firstName
              ? t('parent.greetingNamed', { name: firstName })
              : t('parent.greetingPlain')}
          </Text>
        ) : null}

        {loading && !family ? (
          <ActivityIndicator color={operationColors.addition.accent} />
        ) : error ? (
          <Text style={styles.errorText}>{t('parentAuth.familyError')}</Text>
        ) : !family ? (
          <FamilySetup uid={user.uid} onReady={reload} />
        ) : gated ? (
          <ParentProPaywall />
        ) : (
          <ParentDashboard familyId={family.id} />
        )}
      </View>
    </ScreenContainer>
  );
}

/**
 * Parent area. Rendered directly by the root route when the device role is
 * 'parent'. Signed-out shows the auth form (with a "continue as child" escape);
 * signed-in shows the dashboard/paywall (each owns its own header).
 */
export function ParentPanel() {
  const { t } = useTranslation();
  const { setRole } = useDeviceRole();
  const { user, initializing } = useAuthUser();
  const signedIn = !!user && !user.isAnonymous;

  if (initializing) {
    return (
      <ScreenContainer header={<Header title={t('parent.title')} />}>
        <View style={styles.center}>
          <ActivityIndicator color={operationColors.addition.accent} />
        </View>
      </ScreenContainer>
    );
  }
  if (!signedIn) {
    // Anonymous = a leftover kid session — still "signed out" here.
    return (
      <ScreenContainer scroll header={<Header title={t('parent.title')} />}>
        <ParentAuthForm onContinueAsChild={() => setRole('child')} />
      </ScreenContainer>
    );
  }
  return <SignedInParent user={user as User} />;
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
