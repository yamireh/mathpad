import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Header, IconButton, ScreenContainer } from '../components/ui';
import { colors, spacing, typography } from '../constants/design';
import { useParentalGate } from '../hooks';
import { tapFeedback } from '../lib/feedback';

/** External support site (FAQs + contact). */
const SUPPORT_URL = 'https://www.microclouds.ca/mathpad-support';
/** Hosted privacy policy. */
const PRIVACY_URL = 'https://www.microclouds.ca/mathpad-privacy';

/** Support — points the user to the external help/support page. */
export default function SupportScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { runGated, gate } = useParentalGate();
  const version = Constants.expoConfig?.version ?? '';

  const back = (
    <IconButton
      name="arrow-back"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
    />
  );

  return (
    <ScreenContainer scroll>
      <Header title={t('support.title')} left={back} />

      <View style={styles.body}>
        <EmptyState
          icon="help-buoy-outline"
          title={t('support.heading')}
          hint={t('support.body')}
        />
        <Button
          label={t('support.openSite')}
          onPress={() => {
            tapFeedback();
            runGated(() => void Linking.openURL(SUPPORT_URL));
          }}
        />
        <Button
          label={t('support.privacy')}
          variant="secondary"
          icon="lock-closed-outline"
          onPress={() => {
            tapFeedback();
            runGated(() => void Linking.openURL(PRIVACY_URL));
          }}
        />
      </View>

      {version ? (
        <Text style={styles.version}>{t('support.version', { version })}</Text>
      ) : null}

      {gate}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.xl },
  version: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.size.caption,
    marginTop: spacing.xl,
  },
});
