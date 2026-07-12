import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { useFamily } from '../../../hooks';

/**
 * The parent's family pairing code — created on first sign-in, shown here so a
 * child's device can join the family with it. (The kid-side join flow is the
 * next milestone.)
 */
export function FamilyCode({ ownerUid }: { ownerUid: string }) {
  const { t } = useTranslation();
  const { family, loading, error } = useFamily(ownerUid);

  if (loading) {
    return <ActivityIndicator color={operationColors.addition.accent} />;
  }
  if (error || !family) {
    return <Text style={styles.error}>{t('parentAuth.familyError')}</Text>;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('parentAuth.familyCodeLabel')}</Text>
      <Text style={styles.code} selectable>
        {family.pairingCode}
      </Text>
      <Text style={styles.hint}>{t('parentAuth.familyInstructions')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  code: {
    fontSize: typography.size.display,
    fontWeight: '700',
    letterSpacing: 6,
    color: operationColors.addition.accent,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  error: {
    fontSize: typography.size.body,
    color: colors.wrong,
    textAlign: 'center',
  },
});
