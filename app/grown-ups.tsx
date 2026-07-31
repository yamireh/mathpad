import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WelcomeTips, WELCOME_TIP_ID } from '../components/domain';
import { ChildMenu, ParentMenu } from '../components/settings';
import { Header, IconButton, ScreenContainer } from '../components/ui';
import { useAuthUser, useDeviceRole, useFamilyLink, useTip } from '../hooks';

/**
 * "Grown-ups" menu, reached from the home gear after the parental gate. Picks the
 * right menu for the device — a signed-in parent gets {@link ParentMenu} (→ their
 * dashboard); a kid device gets {@link ChildMenu} (connect to a family, etc.).
 * Each menu owns its own items, so they change independently of one another and
 * of the shared renderer.
 */
export default function GrownUpsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setRole } = useDeviceRole();
  const { linked } = useFamilyLink();
  const { user } = useAuthUser();
  // A signed-in (non-anonymous) grown-up already IS a parent on this device.
  const signedInParent = !!user && !user.isAnonymous;
  // Reopen the welcome tips on demand. Closing just hides it; "Don't show again"
  // also persists the opt-out so it stops appearing on launch.
  const [tipsOpen, setTipsOpen] = useState(false);
  const welcome = useTip(WELCOME_TIP_ID);

  const goToParent = () => {
    setRole('parent');
    router.dismissAll();
  };
  const onTips = () => setTipsOpen(true);
  const onSupport = () => router.push('/support');

  return (
    <ScreenContainer>
      <Header
        title={t('grownUps.title')}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />

      {signedInParent ? (
        <ParentMenu
          onGoToDashboard={goToParent}
          onTips={onTips}
          onSupport={onSupport}
        />
      ) : (
        <ChildMenu
          linked={linked}
          onBecomeParent={goToParent}
          onConnect={() => router.push('/connect')}
          onTips={onTips}
          onSupport={onSupport}
        />
      )}

      <WelcomeTips
        visible={tipsOpen}
        onClose={() => setTipsOpen(false)}
        onDontShowAgain={() => {
          welcome.markSeen();
          setTipsOpen(false);
        }}
      />
    </ScreenContainer>
  );
}
