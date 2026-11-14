import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { availableVariants, pickVariant } from '@/features/game/variants';
import { PlayButton } from '@/features/home/play-button';
import {
  type CategorySummary,
  getCategoryCards,
  type LastRound,
  lastSoloRound,
  listCategories,
  recentlySeenWords,
} from '@/features/packs/repository';
import { useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Icon, Screen, Text } from '@/ui/components';
import { Mascot, type MascotState } from '@/ui/mascot';
import { pop, rise, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing, touchTarget } from '@/ui/tokens';

// Chorégraphie du lancement (MOTION.md §3, ms) : mascotte, titre, bouton Jouer, raccourcis.
const TITLE_AT = 80;
const PLAY_AT = 160;
const SHORTCUTS_AT = 240;
const SHORTCUT_STAGGER = 40;
/** Le bouton respire une fois arrivé (fin de son entrée). */
const BREATHE_AT = 700;
/** La mascotte salue, puis se met au repos. */
const WAVE_MS = 1800;
/** Au-delà de cette taille de police système, les raccourcis passent l'un sous l'autre. */
const LARGE_FONT_SCALE = 1.3;

type Replay = { last: LastRound; categories: CategorySummary[] };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Accueil (DESIGN.md §4, UX.md §2 et §3) : mascotte, gros bouton « Jouer » vivant, raccourcis
 * « Rejouer », « Catégories », « Créer ». Au premier lancement, une bulle propose le tutoriel.
 */
export default function HomeScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const largeFont = useWindowDimensions().fontScale > LARGE_FONT_SCALE;
  const db = useSQLiteContext();
  const systemReduced = useReducedMotion();
  const feedback = useFeedback();
  const hasSeenOnboarding = useSettings((s) => s.hasSeenOnboarding);
  const updateSettings = useSettings((s) => s.update);
  const prepare = useGameSession((s) => s.prepare);
  const setMatch = useGameSession((s) => s.setMatch);

  // Deuxième lancement du jour : entrée courte, tout en fondu (MOTION.md §3).
  const [short] = useState(() => useSettings.getState().lastLaunchDay === today());
  const quiet = systemReduced || short;
  useEffect(() => {
    updateSettings({ lastLaunchDay: today() });
  }, [updateSettings]);

  const [mascot, setMascot] = useState<MascotState>(quiet ? 'rest' : 'wave');
  const [breathing, setBreathing] = useState(quiet);
  useEffect(() => {
    if (quiet) return;
    const timers = [
      setTimeout(() => setMascot('rest'), WAVE_MS),
      setTimeout(() => setBreathing(true), BREATHE_AT),
    ];
    return () => timers.forEach(clearTimeout);
  }, [quiet]);

  const [replay, setReplay] = useState<Replay | null>(null);
  const [replaying, setReplaying] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([lastSoloRound(db), listCategories(db, i18n.language)]).then(
        ([last, all]) => {
          if (!active) return;
          const categories = last ? all.filter((c) => last.categoryIds.includes(c.id)) : [];
          // Catégories supprimées depuis : pas de raccourci.
          setReplay(last && categories.length > 0 ? { last, categories } : null);
        },
      );
      return () => {
        active = false;
      };
    }, [db, i18n.language]),
  );

  /** Mêmes catégories, variante et durée que la dernière manche, directement au front. */
  const startReplay = async (r: Replay) => {
    setReplaying(true);
    try {
      const ids = r.categories.map((c) => c.id);
      const [cards, recentlySeen] = await Promise.all([
        getCategoryCards(db, ids),
        recentlySeenWords(db, ids),
      ]);
      const available = availableVariants(r.categories);
      setMatch(null);
      prepare({
        categories: r.categories,
        cards,
        durationMs: r.last.durationS * 1000,
        variant: pickVariant(r.last.variant, available),
        available,
        recentlySeen,
      });
      router.push('/play/ready');
    } finally {
      setReplaying(false);
    }
  };

  const replayLabel = replay
    ? replay.categories.length > 1
      ? t('home.replayMix', {
          name: replay.categories[0]!.name,
          count: replay.categories.length - 1,
        })
      : replay.categories[0]!.name
    : '';

  return (
    <Screen scroll contentStyle={styles.content}>
      {/* Réglages en haut à droite, hors du bloc centré. */}
      <View
        style={[styles.topBar, { top: insets.top + spacing.sm, right: insets.right + spacing.md }]}
      >
        <Pressable
          onPress={() => feedback('tap', () => router.push('/settings'))}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={t('home.settings')}
        >
          <Icon icon={GearSixIcon} size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <Animated.View entering={pop({ reduced: quiet })} style={styles.mascot}>
        <Mascot state={mascot} size={150} />
      </Animated.View>

      <Animated.View entering={rise({ delay: TITLE_AT, reduced: quiet })} style={styles.title}>
        <Text variant="hero" align="center" accessibilityRole="header">
          {t('app.name')}
        </Text>
        <Text muted align="center">
          {t('home.tagline')}
        </Text>
      </Animated.View>

      {!hasSeenOnboarding ? (
        <Animated.View entering={rise({ delay: TITLE_AT, reduced: quiet })} style={styles.bubble}>
          <Text variant="bodyStrong">{t('home.firstTime')}</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={t('home.showMe')}
                variant="secondary"
                block
                onPress={() => router.push('/tutorial')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('home.iKnow')}
                variant="ghost"
                block
                onPress={() => updateSettings({ hasSeenOnboarding: true })}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={rise({ delay: PLAY_AT, reduced: quiet })}>
        <PlayButton
          label={t('home.play')}
          breathing={breathing}
          onPress={() => router.push('/play/setup')}
        />
      </Animated.View>

      <View style={styles.shortcuts}>
        {replay ? (
          <Animated.View entering={rise({ delay: SHORTCUTS_AT, reduced: quiet })}>
            <Button
              label={`${t('home.replay')} · ${replayLabel}`}
              variant="secondary"
              block
              loading={replaying}
              numberOfLines={2}
              icon={<Icon icon={ArrowCounterClockwiseIcon} />}
              onPress={() => void startReplay(replay)}
            />
          </Animated.View>
        ) : null}
        <Animated.View
          entering={rise({ delay: SHORTCUTS_AT + SHORTCUT_STAGGER, reduced: quiet })}
          style={largeFont ? styles.column : styles.row}
        >
          <View style={largeFont ? undefined : styles.flex}>
            <Button
              label={t('home.categories')}
              variant="secondary"
              block
              icon={<Icon icon={SquaresFourIcon} />}
              onPress={() => router.push('/categories')}
            />
          </View>
          <View style={largeFont ? undefined : styles.flex}>
            <Button
              label={t('home.create')}
              variant="secondary"
              block
              icon={<Icon icon={PlusIcon} />}
              onPress={() => router.push('/create')}
            />
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
  topBar: { position: 'absolute', zIndex: 1 },
  iconButton: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: { alignItems: 'center' },
  title: { gap: spacing.xs },
  bubble: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  column: { gap: spacing.md },
  flex: { flex: 1 },
  shortcuts: { gap: spacing.md },
});
