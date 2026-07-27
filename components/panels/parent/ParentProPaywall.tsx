import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Card, NoticeDialog, Pill } from '../../ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';
import {
  useAuthUser,
  useDeviceRole,
  useParentalGate,
  usePurchases,
} from '../../../hooks';

const ACCENT = operationColors.multiplication.accent; // Parent Pro purple
/** Apple's standard EULA (Terms of Use) + the app's hosted privacy policy. */
const TERMS_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.microclouds.ca/mathpad-privacy';

/** What Parent Pro includes, by i18n key. */
const FEATURES = ['goals', 'exams', 'modules', 'dashboard'] as const;

/**
 * Parent Pro paywall body (Slice 1). The whole parent experience is behind the
 * subscription: a parent with no active sub/trial sees this instead of the
 * dashboard. All-access — parent tools + every module for the family's kids,
 * with a configurable free trial. Purchase runs behind the parental gate.
 * Reusable: embedded in the parent home and in the `/parent-pro` route.
 */
export function ParentProPaywall() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setRole } = useDeviceRole();
  const { user } = useAuthUser();
  // Subscribing attaches to a parent account/family, so it's only actionable
  // for a signed-in parent. A kid/anonymous user is routed to become one.
  const signedInParent = !!user && !user.isAnonymous;
  const { runGated, gate } = useParentalGate();
  const {
    parentProPrice,
    parentProTrialDays,
    parentProTrialUsed,
    subscribeParentPro,
    purchasing,
    restore,
    devSetParentPro,
    purchaseFailed,
    clearPurchaseError,
  } = usePurchases();
  const [pending, setPending] = useState<'sub' | 'restore' | null>(null);

  const run = (key: 'sub' | 'restore', fn: () => Promise<unknown>) =>
    runGated(() => {
      setPending(key);
      void Promise.resolve(fn()).finally(() => setPending(null));
    });

  const offerTrial = parentProTrialDays > 0 && !parentProTrialUsed;
  const cta = offerTrial
    ? t('parentPro.trialCta', { days: parentProTrialDays })
    : t('parentPro.subscribeCta', { price: parentProPrice });

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="ribbon" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.heading}>{t('parentPro.heading')}</Text>
        <Text style={styles.sub}>{t('parentPro.subtitle')}</Text>
      </View>

      <Card style={styles.list}>
        {FEATURES.map((key) => (
          <View key={key} style={styles.row}>
            <Ionicons name="checkmark-circle" size={22} color={ACCENT} />
            <Text style={styles.rowText}>{t(`parentPro.features.${key}`)}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        {/* 1 · Primary action — the one thing we want them to do. */}
        {signedInParent ? (
          <>
            <Button
              label={cta}
              icon="ribbon-outline"
              tone={ACCENT}
              disabled={purchasing}
              loading={pending === 'sub'}
              onPress={() => run('sub', subscribeParentPro)}
            />
            <Text style={styles.priceNote}>
              {offerTrial
                ? t('parentPro.trialNote', { price: parentProPrice })
                : t('parentPro.subscribeNote')}
            </Text>
          </>
        ) : (
          <>
            {/* Not a signed-in parent → subscribing needs a parent account. */}
            <Button
              label={t('parentPro.parentRequired')}
              icon="person-outline"
              tone={ACCENT}
              onPress={() => {
                setRole('parent');
                router.replace('/');
              }}
            />
            <Text style={styles.priceNote}>
              {t('parentPro.parentRequiredNote')}
            </Text>
          </>
        )}

        {/* 2 · Learn more — a value link that reassures before committing. */}
        <Pressable
          onPress={() => router.push('/how-to/parent-pro')}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.seeLink}
        >
          <Text style={styles.seeLinkText}>{t('parentPro.seeIncluded')}</Text>
          <Ionicons name="arrow-forward" size={16} color={ACCENT} />
        </Pressable>

        {/* 3 · Quiet footer — restore + decline, side by side, out of the way. */}
        <View style={styles.footerLinks}>
          {signedInParent ? (
            <>
              <Pressable
                onPress={() => run('restore', restore)}
                disabled={purchasing}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.mutedLink}>{t('parentPro.restore')}</Text>
              </Pressable>
              <View style={styles.footerDot} />
            </>
          ) : null}
          <Pressable
            onPress={() => {
              setRole('child');
              router.replace('/');
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.mutedLink}>{t('parentPro.useAsRegular')}</Text>
          </Pressable>
        </View>

        {/* Apple-required subscription disclosure (Guideline 3.1.2). */}
        <View style={styles.legal}>
          <Text style={styles.legalText}>{t('parentPro.autoRenew')}</Text>
          <View style={styles.legalLinks}>
            <Pressable
              onPress={() => void Linking.openURL(TERMS_URL)}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={styles.legalLink}>{t('parentPro.terms')}</Text>
            </Pressable>
            <View style={styles.footerDot} />
            <Pressable
              onPress={() => void Linking.openURL(PRIVACY_URL)}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={styles.legalLink}>{t('parentPro.privacy')}</Text>
            </Pressable>
          </View>
        </View>

        {__DEV__ ? (
          <View style={styles.dev}>
            <Pill
              label="DEV: unlock Parent Pro"
              icon="bug-outline"
              onPress={() => devSetParentPro(true)}
            />
          </View>
        ) : null}
      </View>

      {gate}
      <NoticeDialog
        visible={purchaseFailed}
        title={t('purchase.errorTitle')}
        message={t('purchase.errorBody')}
        buttonLabel={t('common.gotIt')}
        onDismiss={clearPurchaseError}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heading: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  list: { gap: spacing.md, marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { fontSize: typography.size.bodyLarge, color: colors.text },
  actions: { gap: spacing.md, marginTop: spacing.xxl },
  priceNote: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.md,
  },
  // Learn-more value link (accent, with the arrow).
  seeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  seeLinkText: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.medium,
    color: ACCENT,
  },
  // Quiet footer link row (restore · continue).
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  mutedLink: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  // Required subscription disclosure + Terms / Privacy.
  legal: { gap: spacing.sm, marginTop: spacing.lg, alignItems: 'center' },
  legalText: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.lineHeight.caption,
    paddingHorizontal: spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  legalLink: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  dev: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
});
