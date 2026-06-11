import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ClockModule } from '../components/domain/clock';
import { ComingSoon } from '../components/panels';
import { usePurchases } from '../hooks';
import { CLOCK_ENABLED } from '../lib/featureFlags';

/**
 * Clock topic. When the feature flag is on the Clock module is paid — gated
 * behind the unlock screen until owned; otherwise a "Coming Soon" placeholder.
 */
export default function ClockRoute() {
  const { t } = useTranslation();
  const { clockOwned } = usePurchases();
  if (!CLOCK_ENABLED) {
    return <ComingSoon title={t('topics.clock')} iconName="time-outline" />;
  }
  if (!clockOwned) return <Redirect href="/unlock-clock" />;
  return <ClockModule />;
}
