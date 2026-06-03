import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/panels';

/** Money topic — placeholder until the feature ships. */
export default function MoneyRoute() {
  const { t } = useTranslation();
  return <ComingSoon title={t('topics.money')} iconName="cash-outline" />;
}
