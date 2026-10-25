import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { CategoryCard } from '@/features/packs/components/category-card';
import {
  type CategorySummary,
  getCategoryCards,
  listCategories,
  recentlySeenWords,
} from '@/features/packs/repository';
import { type RoundDuration, useSettings } from '@/features/settings/store';
import { Button, Screen, SegmentedControl, Text } from '@/ui/components';
import { rise, staggerDelay, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

const DURATIONS: readonly RoundDuration[] = [30, 60, 90, 120];

/** Préparation : catégorie → durée → « C'est parti » (3 taps depuis l'accueil, UX.md §2). */
export default function PlaySetupScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ category?: string }>();
  const defaultDuration = useSettings((s) => s.defaultDuration);
  const updateSettings = useSettings((s) => s.update);
  const lastCategory = useGameSession((s) => s.category);
  const prepare = useGameSession((s) => s.prepare);

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  // Catégorie venue de l'écran Catégories, sinon la dernière jouée (UX.md §3).
  const [categoryId, setCategoryId] = useState<number | null>(
    params.category ? Number(params.category) : (lastCategory?.id ?? null),
  );
  const [duration, setDuration] = useState<RoundDuration>(defaultDuration);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listCategories(db, i18n.language).then((list) => {
        if (active) setCategories(list);
      });
      return () => {
        active = false;
      };
    }, [db, i18n.language]),
  );

  // La catégorie demandée (« Jouer avec », dernière jouée) passe en tête : sinon elle peut être
  // sélectionnée tout en bas de la grille, hors de vue. Ordre figé sur le choix initial.
  const [initialId] = useState(categoryId);
  const ordered = useMemo(
    () => [
      ...categories.filter((c) => c.id === initialId),
      ...categories.filter((c) => c.id !== initialId),
    ],
    [categories, initialId],
  );

  const durationOptions = useMemo(
    () => DURATIONS.map((value) => ({ value, label: t('setup.seconds', { count: value }) })),
    [t],
  );

  const start = async () => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    setStarting(true);
    try {
      const [cards, recentlySeen] = await Promise.all([
        getCategoryCards(db, category.id),
        recentlySeenWords(db, category.id),
      ]);
      // La durée choisie devient la durée par défaut (variante et durée mémorisées, UX.md §3).
      updateSettings({ defaultDuration: duration });
      prepare({ category, cards, durationMs: duration * 1000, recentlySeen });
      router.push('/play/ready');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="display" accessibilityRole="header">
        {t('screens.playSetup')}
      </Text>

      <Text variant="heading" accessibilityRole="header">
        {t('setup.category')}
      </Text>
      <View style={styles.grid}>
        {ordered.map((category, index) => {
          const selected = category.id === categoryId;
          return (
            <Animated.View
              key={category.id}
              entering={rise({ delay: staggerDelay(index) ?? 0, reduced })}
              style={[styles.gridItem, selected && styles.selected]}
              accessibilityState={{ selected }}
            >
              <CategoryCard
                category={category}
                selected={selected}
                onPress={() => setCategoryId(category.id)}
              />
            </Animated.View>
          );
        })}
      </View>

      <Text variant="heading" accessibilityRole="header">
        {t('setup.duration')}
      </Text>
      <SegmentedControl
        options={durationOptions}
        value={duration}
        onChange={setDuration}
        accessibilityLabel={t('setup.duration')}
      />

      <View style={styles.variant}>
        <Text variant="labelSmall" muted>
          {t('setup.variant')}
        </Text>
        <Text variant="bodyStrong">{t('variants.classic.name')}</Text>
        <Text muted>{t('variants.classic.instruction')}</Text>
      </View>

      <Button
        label={t('setup.start')}
        size="lg"
        block
        loading={starting}
        disabled={!categories.some((c) => c.id === categoryId)}
        onPress={() => void start()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%', borderRadius: radii.card + 4, padding: 2 },
  // Sélection : contour blanc cassé (et coche), jamais la couleur seule.
  selected: { backgroundColor: colors.text },
  variant: { gap: spacing.xs, marginTop: spacing.sm },
});
