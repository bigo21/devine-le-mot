import { Link, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import type { Translation } from '@/lib/i18n/locales/fr';
import { PlaceholderScreen } from '@/ui/components/placeholder-screen';
import { colors, fonts } from '@/ui/tokens';

// Navigation provisoire vers tous les écrans, le temps de la phase 0.
const screens: { href: Href; key: keyof Translation['screens'] }[] = [
  { href: '/categories', key: 'categories' },
  { href: '/categories/demo', key: 'categoryDetail' },
  { href: '/play/setup', key: 'playSetup' },
  { href: '/play/ready', key: 'playReady' },
  { href: '/play/game', key: 'playGame' },
  { href: '/play/results', key: 'playResults' },
  { href: '/create', key: 'create' },
  { href: '/create/editor', key: 'editor' },
  { href: '/tutorial', key: 'tutorial' },
  { href: '/settings', key: 'settings' },
];

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen title={t('app.name')}>
      {screens.map(({ href, key }) => (
        <Link key={key} href={href} style={styles.link}>
          {t(`screens.${key}`)}
        </Link>
      ))}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.mango,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    paddingVertical: 12,
  },
});
