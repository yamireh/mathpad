import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/panels';

/** Clock topic — placeholder until the feature ships. */
export default function ClockRoute() {
  const { t } = useTranslation();
  return <ComingSoon title={t('topics.clock')} iconName="time-outline" />;
}
