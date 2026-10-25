import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { seedBuiltinPacks } from '@/features/packs/repository';
import { DATABASE_NAME, initDatabase } from '@/lib/db';
import { fontAssets } from '@/lib/fonts';
import i18n from '@/lib/i18n';
import { useLanguageSync } from '@/lib/i18n/use-language-sync';
import { colors, fonts, spacing } from '@/ui/tokens';

void SplashScreen.preventAutoHideAsync();

/** Base prête : migrations, puis paquets intégrés (insérés ou mis à jour selon leur version). */
async function prepareDatabase(db: SQLiteDatabase) {
  await initDatabase(db);
  await seedBuiltinPacks(db);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  useLanguageSync();

  // Sans police, on affiche quand même l'app (polices système) plutôt que de rester bloqué.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="light" />
        <Suspense fallback={<View style={styles.root} />}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase} useSuspense>
            <HideSplashWhenReady />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'fade',
              }}
            />
          </SQLiteProvider>
        </Suspense>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

/** Monté seulement quand polices et base sont prêtes : on retire le splash à ce moment-là. */
function HideSplashWhenReady() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return null;
}

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  useEffect(() => {
    void SplashScreen.hideAsync();
    console.error(error);
  }, [error]);

  return (
    <View style={[styles.root, styles.error]}>
      <Text style={styles.errorText}>{t('errors.unexpected')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  error: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, textAlign: 'center' },
});
