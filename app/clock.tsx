import { useTranslation } from 'react-i18next';

import { ClockModule } from '../components/domain/clock';
import { ComingSoon } from '../components/panels';
import { CLOCK_ENABLED } from '../lib/featureFlags';

/**
 * Clock topic. Live when the feature flag is on (the Clock module: settings →
 * practice → results); otherwise a "Coming Soon" placeholder.
 */
export default function ClockRoute() {
  const { t } = useTranslation();
  if (CLOCK_ENABLED) return <ClockModule />;
  return <ComingSoon title={t('topics.clock')} iconName="time-outline" />;
}
