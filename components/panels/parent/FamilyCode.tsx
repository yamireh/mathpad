import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  operationColors,
  radius,
  spacing,
  typography,
} from '../../../constants/design';

/**
 * A shareable code card — the kid pairing code by default, or (with custom
 * label/hint) a co-parent invite code. Presentational; the caller loads it.
 */
export function FamilyCode({
  code,
  label,
  hint,
}: {
  code: string;
  label?: string;
  hint?: string;
}) {
  const { t } = useTranslation();
  // undefined -> default hint; empty string -> no hint (caller shows steps).
  const hintText = hint === undefined ? t('parentAuth.familyInstructions') : hint;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label ?? t('parentAuth.familyCodeLabel')}</Text>
      <Text style={styles.code} selectable>
        {code}
      </Text>
      {hintText ? <Text style={styles.hint}>{hintText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // A distinct inset "well" (light fill + border) so the code stands apart from
  // the white instruction card it sits inside.
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
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
