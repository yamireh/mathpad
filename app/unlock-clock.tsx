import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Header,
  IconButton,
  NoticeDialog,
  Pill,
  ScreenContainer,
} from '../components/ui';
import {
  clockColors,
  colors,
  radius,
  spacing,
  typography,
} from '../constants/design';
import { useParentalGate, usePurchases } from '../hooks';
import { COMPLETE_BUNDLE_ENABLED } from '../lib/featureFlags';

/** What the Clock module includes, by i18n key. */
const FEATURES = ['read', 'write', 'words', 'set'] as const;

/**
 * Unlock Clock — the store surface for the Clock module ($4.99). Mirrors the
 * Operations {@link UnlockScreen}: calm Try-Free framing (per the pricing
 * rules), a "Watch how it works" demo, then buy or restore. Reached when a kid
 * taps the locked Clock topic.
 */
export default function UnlockClockScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { runGated, gate } = useParentalGate();
  const {
    clockPrice,
    completePrice,
    purchasing,
    clockOwned,
    purchaseClock,
    purchaseComplete,
    restore,
    devSetClockOwned,
    purchaseFailed,
    clearPurchaseError,
  } = usePurchases();
  // Which action is in flight — so only that button shows the spinner.
  const [pending, setPending] = useState<'clock' | 'complete' | 'restore' | null>(
    null,
  );
  const runPurchase = (
    key: 'clock' | 'complete' | 'restore',
    fn: () => Promise<unknown>,
  ) =>
    runGated(() => {
      setPending(key);
      void Promise.resolve(fn()).finally(() => setPending(null));
    });

  // Once owned (just bought or restored), the module is unlocked — leave.
  useEffect(() => {
    if (clockOwned) router.back();
  }, [clockOwned, router]);

  return (
    <ScreenContainer scroll>
      <Header
        title={t('unlockClock.title')}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />

      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="time-outline" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.heading}>{t('unlockClock.heading')}</Text>
        <Text style={styles.sub}>{t('unlockClock.subtitle')}</Text>
      </View>

      <Card style={styles.list}>
        {FEATURES.map((key) => (
          <View key={key} style={styles.row}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={clockColors.hourHand}
            />
            <Text style={styles.rowText}>{t(`unlockClock.features.${key}`)}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <Button
          label={t('unlockClock.watch')}
          icon="play-circle-outline"
          variant="secondary"
          onPress={() => router.push('/how-to/clock')}
        />
        <Button
          label={t('unlockClock.cta', { price: clockPrice })}
          icon="lock-open-outline"
          tone={clockColors.hourHand}
          disabled={purchasing}
          loading={pending === 'clock'}
          onPress={() => runPurchase('clock', purchaseClock)}
        />
        {COMPLETE_BUNDLE_ENABLED ? (
          <Button
            label={t('unlock.ctaAll', { price: completePrice })}
            icon="sparkles-outline"
            variant="secondary"
            disabled={purchasing}
            loading={pending === 'complete'}
            onPress={() => runPurchase('complete', purchaseComplete)}
          />
        ) : null}
        <Button
          label={t('unlockClock.restore')}
          variant="ghost"
          disabled={purchasing}
          loading={pending === 'restore'}
          onPress={() => runPurchase('restore', restore)}
        />
        <Text style={styles.restoreHint}>{t('unlockClock.restoreHint')}</Text>
        {__DEV__ ? (
          <View style={styles.dev}>
            <Pill
              label="DEV: clock locked"
              icon="bug-outline"
              onPress={() => devSetClockOwned(true)}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: clockColors.hourHand,
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
  restoreHint: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.md,
  },
  dev: { alignItems: 'center', marginTop: spacing.sm },
});
