import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function TutorialScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('screens.tutorial')} />;
}
