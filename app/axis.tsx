import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/panels';

/** Coordinates / X-Y axis topic — placeholder until the feature ships. */
export default function AxisRoute() {
  const { t } = useTranslation();
  return <ComingSoon title={t('topics.axis')} iconName="analytics-outline" />;
}
