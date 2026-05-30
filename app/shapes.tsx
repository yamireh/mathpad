import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/panels';

/** Shapes topic — placeholder until the feature ships. */
export default function ShapesRoute() {
  const { t } = useTranslation();
  return <ComingSoon title={t('topics.shapes')} iconName="shapes-outline" />;
}
