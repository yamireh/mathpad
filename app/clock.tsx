import { useTranslation } from 'react-i18next';

import { ClockPreview } from '../components/domain/clock';
import { ComingSoon } from '../components/panels';
import { CLOCK_ENABLED } from '../lib/featureFlags';

/**
 * Clock topic. Live when the feature flag is on (renders the Clock module —
 * currently the preview, the settings/practice flow lands here next); otherwise
 * a "Coming Soon" placeholder.
 */
export default function ClockRoute() {
  const { t } = useTranslation();
  if (CLOCK_ENABLED) return <ClockPreview />;
  return <ComingSoon title={t('topics.clock')} iconName="time-outline" />;
}
