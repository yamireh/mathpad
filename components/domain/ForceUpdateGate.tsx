import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, operationColors, spacing, typography } from '../../constants/design';
import { appStoreUrl } from '../../lib/appConfig';
import { Button } from '../ui';

export interface ForceUpdateGateProps {
  /** App Store numeric id for the deep link (null → open the App Store app). */
  appStoreId: string | null;
}

/**
 * Full-screen blocking overlay shown when the installed app version is below the
 * remote minimum. There is no dismiss — the only action is to update.
 */
export function ForceUpdateGate({ appStoreId }: ForceUpdateGateProps) {
  const { t } = useTranslation();
  const openStore = () => {
    const url = appStoreUrl(appStoreId) ?? 'itms-apps://apps.apple.com';
    Linking.openURL(url).catch(() => {});
  };
  return (
    <View style={styles.overlay}>
      <Ionicons
        name="arrow-up-circle"
        size={64}
        color={operationColors.addition.accent}
      />
      <Text style={styles.title}>{t('forceUpdate.title')}</Text>
      <Text style={styles.body}>{t('forceUpdate.body')}</Text>
      <View style={styles.action}>
        <Button
          label={t('forceUpdate.cta')}
          onPress={openStore}
          tone={operationColors.addition.accent}
          icon="cloud-download-outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});
