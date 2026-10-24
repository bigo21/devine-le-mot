import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Screen } from './screen';
import { Text } from './text';

type Props = {
  title: string;
  children?: ReactNode;
};

/** Écran provisoire de la phase 0 : titre + mention « en construction ». */
export function PlaceholderScreen({ title, children }: Props) {
  const { t } = useTranslation();

  return (
    <Screen scroll>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text muted>{t('common.wip')}</Text>
      {children}
    </Screen>
  );
}
