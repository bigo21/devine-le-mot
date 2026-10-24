import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function PlayGameScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('screens.playGame')} />;
}
