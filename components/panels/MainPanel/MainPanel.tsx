import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../ui';
import { colors, spacing, typography } from '../../../constants/design';
import { tapFeedback } from '../../../lib/feedback';
import { TopicCard } from './TopicCard';
import { TOPICS } from './topics';

/**
 * MainPanel — top-level topic chooser. Lists every kid-facing topic
 * (Operations, Shapes, Clock, Coordinates, …) as a tappable card.
 * Disabled topics still navigate, landing on the shared ComingSoon
 * placeholder. The list comes from `topics.ts` so adding a new topic
 * is a one-line change.
 */
export function MainPanel() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{t('app.name')}</Text>
      <Text style={styles.greeting}>{t('home.greeting')}</Text>

      <View style={styles.grid}>
        {TOPICS.map((topic) => (
          <TopicCard
            key={topic.id}
            label={t(topic.labelKey)}
            icon={topic.icon}
            accent={topic.accent}
            tint={topic.tint}
            enabled={topic.enabled}
            comingSoonLabel={t('comingSoon.tag')}
            onPress={() => {
              tapFeedback();
              router.push(topic.route);
            }}
          />
        ))}
      </View>

      <Pressable
        style={styles.support}
        accessibilityRole="button"
        accessibilityLabel={t('home.support')}
        onPress={() => {
          tapFeedback();
          router.push('/support');
        }}
      >
        <Ionicons
          name="help-buoy-outline"
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.supportLabel}>{t('home.support')}</Text>
      </Pressable>
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
  grid: { gap: spacing.md },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  supportLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
});
