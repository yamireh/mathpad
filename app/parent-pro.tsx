import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ParentProPaywall } from '../components/panels/parent/ParentProPaywall';
import { Header, IconButton, ScreenContainer } from '../components/ui';
import { useFamilyLink, usePurchases } from '../hooks';

/**
 * Parent Pro paywall route — reached from Grown-ups → Parent Pro. The parent
 * home embeds the same {@link ParentProPaywall} directly (the whole parent
 * experience is subscription-gated), so this route mainly serves the menu link;
 * it dismisses itself once the subscription/trial becomes active.
 */
export default function ParentProScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { parentProActive } = usePurchases();
  const { linked } = useFamilyLink();

  // Dismiss once the sub/trial is active, or if this device is a linked child
  // (it inherits access from its family and must not see the paywall).
  useEffect(() => {
    if (parentProActive || linked) router.back();
  }, [parentProActive, linked, router]);

  return (
    <ScreenContainer padded={false}>
      <Header
        title={t('parentPro.title')}
        left={
          <IconButton
            name="arrow-back"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
          />
        }
      />
      <ParentProPaywall />
    </ScreenContainer>
  );
}
