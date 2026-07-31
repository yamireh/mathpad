import { useTranslation } from 'react-i18next';

import { type MenuItem, SettingsMenu } from './SettingsMenu';

/**
 * Settings menu for a kid device (no parent signed in): connect this device to a
 * family, become a parent (while unlinked), plus help. Once linked, the device is
 * locked to child mode — a dev-only switch stays so one device can test both
 * sides. Owns its own items, isolated from the parent menu and the renderer.
 */
export function ChildMenu({
  linked,
  onBecomeParent,
  onConnect,
  onTips,
  onSupport,
}: {
  linked: boolean;
  onBecomeParent: () => void;
  onConnect: () => void;
  onTips: () => void;
  onSupport: () => void;
}) {
  const { t } = useTranslation();
  const items: MenuItem[] = [];
  if (!linked) {
    items.push({
      icon: 'people-circle-outline',
      label: t('grownUps.parents'),
      onPress: onBecomeParent,
    });
  } else if (__DEV__) {
    items.push({
      icon: 'construct-outline',
      label: t('grownUps.devSwitchParent'),
      onPress: onBecomeParent,
    });
  }
  items.push({
    icon: linked ? 'link' : 'link-outline',
    label: t(linked ? 'grownUps.connected' : 'grownUps.connectFamily'),
    onPress: onConnect,
  });
  items.push({ icon: 'bulb-outline', label: t('grownUps.tips'), onPress: onTips });
  items.push({
    icon: 'help-buoy-outline',
    label: t('home.support'),
    onPress: onSupport,
  });
  return <SettingsMenu items={items} />;
}
