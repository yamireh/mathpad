import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, operationColors, spacing, typography } from '../../constants/design';
import { storeUpdateUrls } from '../../lib/appConfig';
import { Button } from '../ui';

export interface ForceUpdateGateProps {
  /** App Store numeric id for the iOS deep link (null → App Store front). */
  appStoreId: string | null;
}

/** This app's package/bundle id, from the embedded config (stable fallback). */
const PACKAGE_ID =
  Constants.expoConfig?.android?.package ??
  Constants.expoConfig?.ios?.bundleIdentifier ??
  'com.mc.mathpad';

/**
 * MathPen's App Store numeric id (apps.apple.com/app/id6785151405). Baked in so
 * iOS "Update" reaches the real listing even before the remote config carries
 * `ios.appStoreId`; a config value, when present, still overrides it.
 */
const DEFAULT_APP_STORE_ID = '6785151405';

/**
 * Full-screen blocking overlay shown when the installed app version is below the
 * remote minimum. There is no dismiss — the only action is to update.
 */
export function ForceUpdateGate({ appStoreId }: ForceUpdateGateProps) {
  const { t } = useTranslation();
  // Send the kid to THIS app's listing — Play Store on Android, App Store on
  // iOS — trying the store-app deep link first, then the https page.
  const openStore = async () => {
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    const urls = storeUpdateUrls(platform, {
      appStoreId: appStoreId ?? DEFAULT_APP_STORE_ID,
      packageId: PACKAGE_ID,
    });
    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Deep link unavailable on this device — try the next candidate.
      }
    }
  };
  return (
    <View style={styles.overlay}>
      <Ionicons
        name="sparkles"
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
