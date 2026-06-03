import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/panels';

/** Patterns topic — placeholder until the feature ships. */
export default function PatternsRoute() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('topics.patterns')}
      iconName="extension-puzzle-outline"
    />
  );
}
