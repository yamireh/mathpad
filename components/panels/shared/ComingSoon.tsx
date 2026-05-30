import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Header, IconButton, ScreenContainer } from '../../ui';
import { colors, spacing, typography } from '../../../constants/design';

export interface ComingSoonProps {
  /** Title shown at the top (usually the topic name). */
  title: string;
  /** Optional Ionicon name shown above the message. */
  iconName?: keyof typeof Ionicons.glyphMap;
}

/**
 * Placeholder screen for topics that aren't built yet (Shapes, Clock,
 * Coordinates, …). Shared so every "coming soon" page looks the same.
 */
export function ComingSoon({ title, iconName = 'sparkles-outline' }: ComingSoonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenContainer>
      <Header
        title={title}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />
      <View style={styles.body}>
        <Ionicons name={iconName} size={64} color={colors.textMuted} />
        <Text style={styles.headline}>{t('comingSoon.headline')}</Text>
        <Text style={styles.body_}>{t('comingSoon.body')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  headline: {
    fontSize: typography.size.heading,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  body_: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
