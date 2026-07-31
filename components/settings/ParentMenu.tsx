import { useTranslation } from 'react-i18next';

import { SettingsMenu } from './SettingsMenu';

/**
 * Settings menu for a signed-in parent on this device: straight to their
 * dashboard, plus help. No "connect" row — a parent isn't a kid device. Owns its
 * own items, so editing it can't affect the child menu or the list renderer.
 */
export function ParentMenu({
  onGoToDashboard,
  onTips,
  onSupport,
}: {
  onGoToDashboard: () => void;
  onTips: () => void;
  onSupport: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SettingsMenu
      items={[
        {
          icon: 'people-circle-outline',
          label: t('grownUps.goToDashboard'),
          onPress: onGoToDashboard,
        },
        { icon: 'bulb-outline', label: t('grownUps.tips'), onPress: onTips },
        {
          icon: 'help-buoy-outline',
          label: t('home.support'),
          onPress: onSupport,
        },
      ]}
    />
  );
}
