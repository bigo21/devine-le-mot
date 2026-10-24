import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function SettingsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('screens.settings')} />;
}
