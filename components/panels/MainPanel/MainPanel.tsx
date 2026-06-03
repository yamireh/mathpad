import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../ui';
import {
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { tapFeedback } from '../../../lib/feedback';
import { TopicCard } from './TopicCard';
import { TOPICS } from './topics';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ART = require('../../../assets/icon.png');

/**
 * MainPanel — top-level topic chooser. A small colourful hero greets the
 * kid (with the app's abacus art), then every kid-facing topic shows as a
 * premium tappable card. Disabled topics still navigate, landing on the
 * shared ComingSoon placeholder. The list comes from `topics.ts`.
 */
export function MainPanel() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenContainer scroll>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroGreeting}>{t('home.greeting')}</Text>
          <Text style={styles.heroSubtitle}>{t('home.subtitle')}</Text>
        </View>
        <Image source={APP_ART} style={styles.heroArt} resizeMode="cover" />
      </View>

      <View style={styles.grid}>
        {TOPICS.map((topic) => (
          <TopicCard
            key={topic.id}
            label={t(topic.labelKey)}
            description={t(topic.descKey)}
            icon={topic.icon}
            accent={topic.accent}
            tint={topic.tint}
            enabled={topic.enabled}
            readyLabel={t('home.ready')}
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
        <Ionicons name="help-buoy-outline" size={18} color={colors.textMuted} />
        <Text style={styles.supportLabel}>{t('home.support')}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: operationColors.addition.accent,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  heroText: { flex: 1 },
  heroGreeting: {
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
    fontWeight: typography.weight.medium,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.size.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroArt: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
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
