import { useTranslation } from 'react-i18next';

import { ClockPreview } from '../components/domain/clock';
import { ComingSoon } from '../components/panels';

/**
 * Shapes topic — "Coming Soon" in production. In development it hosts the
 * interactive Clock preview so we can build/see the Clock module while Clock's
 * own route stays a clean placeholder.
 */
export default function ShapesRoute() {
  const { t } = useTranslation();
  if (__DEV__) return <ClockPreview />;
  return <ComingSoon title={t('topics.shapes')} iconName="shapes-outline" />;
}
