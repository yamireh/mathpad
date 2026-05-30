import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { OperationCard } from '../components/domain';
import { Pill, ScreenContainer } from '../components/ui';
import { colors, spacing, typography } from '../constants/design';
import { tapFeedback } from '../lib/feedback';
import type { Operation } from '../types';

/** Topic cards, in display order. */
const OPERATIONS: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'mix',
];

/** Home — greeting, the five topic cards, and a History shortcut. */
export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{t('app.name')}</Text>
      <Text style={styles.greeting}>{t('home.greeting')}</Text>

      <View style={styles.grid}>
        {OPERATIONS.map((operation) => (
          <OperationCard
            key={operation}
            operation={operation}
            label={t(`operations.${operation}`)}
            onPress={() => {
              tapFeedback();
              router.push(`/settings/${operation}`);
            }}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Pill
          label={t('home.history')}
          icon="time-outline"
          onPress={() => router.push('/history')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  greeting: {
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
});
