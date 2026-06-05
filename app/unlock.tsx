import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, IconButton, ScreenContainer } from '../components/ui';
import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../constants/design';
import { usePurchases } from '../hooks';
import type { Operation } from '../types';

/** Operations unlocked by the bundle (Addition is always free). */
const UNLOCKED: Operation[] = [
  'subtraction',
  'multiplication',
  'division',
  'mix',
];

/**
 * Unlock — the store surface for the Operations bundle. Reached when a kid
 * taps a locked operation. Calm, Try-Free framing (no countdowns or pressure,
 * per the pricing rules); buys or restores the one $9.99 non-consumable.
 */
export default function UnlockScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { operation } = useLocalSearchParams<{ operation?: Operation }>();
  const {
    price,
    completePrice,
    purchasing,
    owned,
    purchase,
    purchaseComplete,
    restore,
  } = usePurchases();
  // The kid can preview the tapped operation's worked-example demo before buying.
  const canWatch = !!operation && operation !== 'mix';

  // Once owned (just bought or restored), the operations are unlocked — leave.
  useEffect(() => {
    if (owned) router.back();
  }, [owned, router]);

  return (
    <ScreenContainer scroll>
      <Header
        title={t('unlock.title')}
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
          <Ionicons name="sparkles" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.heading}>{t('unlock.heading')}</Text>
        <Text style={styles.sub}>{t('unlock.subtitle')}</Text>
      </View>

      <Card style={styles.list}>
        {UNLOCKED.map((operation) => (
          <View key={operation} style={styles.row}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={operationColors[operation].accent}
            />
            <Text style={styles.rowText}>{t(`operations.${operation}`)}</Text>
          </View>
        ))}
        <Text style={styles.freeNote}>{t('unlock.freeNote')}</Text>
      </Card>

      <View style={styles.actions}>
        {canWatch ? (
          <Button
            label={t('unlock.watch')}
            icon="play-circle-outline"
            variant="secondary"
            onPress={() => router.push(`/how-to/${operation}`)}
          />
        ) : null}
        <Button
          label={t('unlock.ctaModule', { price })}
          icon="lock-open-outline"
          tone={operationColors.multiplication.accent}
          disabled={purchasing}
          onPress={() => void purchase()}
        />
        <Button
          label={t('unlock.ctaAll', { price: completePrice })}
          icon="sparkles-outline"
          variant="secondary"
          disabled={purchasing}
          onPress={() => void purchaseComplete()}
        />
        <Button
          label={t('unlock.restore')}
          variant="ghost"
          disabled={purchasing}
          onPress={() => void restore()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: operationColors.multiplication.accent,
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
  rowText: {
    fontSize: typography.size.bodyLarge,
    color: colors.text,
  },
  freeNote: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: { gap: spacing.md, marginTop: spacing.xxl },
});
