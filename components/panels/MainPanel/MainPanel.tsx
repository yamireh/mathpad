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
import { usePurchases } from '../../../hooks';
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
  const { clockOwned } = usePurchases();

  return (
    <ScreenContainer scroll>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          {/* Keep the greeting on one line: at full size on a normal-width
              screen, shrinking to fit only when the column is tight (e.g. a
              device with a large Display-size / screen-zoom setting). No OS
              font scaling so it can't grow past its designed size either. */}
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.heroGreeting}
          >
            {t('home.greeting')}
          </Text>
          <Text allowFontScaling={false} numberOfLines={2} style={styles.heroSubtitle}>
            {t('home.subtitle')}
          </Text>
        </View>
        <Image source={APP_ART} style={styles.heroArt} resizeMode="cover" />
      </View>

      <View style={styles.grid}>
        {TOPICS.map((topic) => {
          // Clock is a paid module: when it's live but not owned, the card is
          // locked and routes to its unlock page instead of the module.
          const locked = topic.id === 'clock' && topic.enabled && !clockOwned;
          return (
            <TopicCard
              key={topic.id}
              label={t(topic.labelKey)}
              description={t(topic.descKey)}
              icon={topic.icon}
              accent={topic.accent}
              enabled={topic.enabled}
              comingSoonLabel={t('comingSoon.tag')}
              locked={locked}
              onPress={() => {
                tapFeedback();
                router.push(locked ? '/unlock-clock' : topic.route);
              }}
            />
          );
        })}
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
