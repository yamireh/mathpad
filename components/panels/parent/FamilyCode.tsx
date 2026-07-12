import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';

/**
 * The family's pairing code — shown so a child's device can join the family
 * with it. Presentational; the caller loads the family.
 */
export function FamilyCode({ code }: { code: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('parentAuth.familyCodeLabel')}</Text>
      <Text style={styles.code} selectable>
        {code}
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
});
