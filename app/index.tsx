import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { design, operationColors, type OperationColorKey } from '../constants/design';

/** Order the operation accent swatches are shown in. */
const OPERATIONS: OperationColorKey[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'mix',
];

/**
 * Placeholder landing screen.
 *
 * Exists to prove the foundation is wired up end to end: design tokens,
 * i18n (text comes from the translation catalogue) and safe-area handling.
 * Replaced by the real Home screen in a later phase.
 */
export default function HelloScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.greeting}>Hello</Text>
        <Text style={styles.title}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('app.tagline')}</Text>

        <View style={styles.swatches}>
          {OPERATIONS.map((operation) => (
            <View
              key={operation}
              style={[
                styles.swatch,
                { backgroundColor: operationColors[operation].accent },
              ]}
            />
          ))}
        </View>

        <Text style={styles.caption}>Design system wired up</Text>
      </View>
    </SafeAreaView>
  );
}

const { colors, spacing, typography, radius } = design;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  greeting: {
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
  title: {
    fontSize: typography.size.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  tagline: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
  swatches: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
  },
  caption: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
