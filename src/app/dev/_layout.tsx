import { Redirect, Stack } from 'expo-router';

import { colors } from '@/ui/tokens';

/**
 * Écrans de développement : joignables seulement en développement. En version finale, un lien
 * direct (devinelemot://dev) renvoie à l'accueil ; ces écrans seront retirés en Phase 5.
 */
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    />
  );
}
