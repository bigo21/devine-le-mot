import { Link, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import type { Translation } from '@/lib/i18n/locales/fr';
import { PlaceholderScreen } from '@/ui/components/placeholder-screen';
import { colors, fonts } from '@/ui/tokens';

// Menu de développement : accès direct à tous les écrans et aux écrans de test (dev uniquement,
// ouvert par un appui long sur le titre de l'accueil).
const screens: { href: Href; key: keyof Translation['screens'] }[] = [
  { href: '/', key: 'home' },
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
  { href: '/dev/ui', key: 'devUi' },
  { href: '/dev/tilt', key: 'devTilt' },
  { href: '/dev/skia', key: 'devSkia' },
  { href: '/dev/three', key: 'devThree' },
];

export default function DevMenuScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen title={t('screens.devMenu')}>
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
