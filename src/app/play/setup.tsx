import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VariantIcon } from '@/features/game/components/variant-icon';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import {
  availableVariants,
  pickVariant,
  tooFewWordsFor,
  type VariantId,
} from '@/features/game/variants';
import { CategoryCard } from '@/features/packs/components/category-card';
import {
  type CategorySummary,
  getCategoryCards,
  listCategories,
  recentlySeenWords,
} from '@/features/packs/repository';
import { type RoundDuration, useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Icon, Screen, SegmentedControl, Text } from '@/ui/components';
import { rise, staggerDelay, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

const DURATIONS: readonly RoundDuration[] = [30, 60, 90, 120];
const VARIANT_CARD_WIDTH = 148;

/**
 * Préparation : variante → durée → catégories (une ou plusieurs, mélangées) → « C'est parti »
 * (3 taps depuis l'accueil, UX.md §2 ; variante et durée mémorisées).
 */
export default function PlaySetupScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const defaultDuration = useSettings((s) => s.defaultDuration);
  const lastVariant = useSettings((s) => s.lastVariant);
  const updateSettings = useSettings((s) => s.update);
  const lastCategories = useGameSession((s) => s.categories);
  const prepare = useGameSession((s) => s.prepare);

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  // Catégorie venue de l'écran Catégories, sinon celles de la dernière manche (UX.md §3).
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    params.category ? [Number(params.category)] : lastCategories.map((c) => c.id),
  );
  const [variantChoice, setVariantChoice] = useState<VariantId | null>(null);
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

  // Les catégories choisies au départ passent en tête : sinon elles peuvent être sélectionnées
  // tout en bas de la grille, hors de vue. Ordre figé sur le choix initial.
  const [initialIds] = useState(selectedIds);
  const ordered = useMemo(
    () => [
      ...categories.filter((c) => initialIds.includes(c.id)),
      ...categories.filter((c) => !initialIds.includes(c.id)),
    ],
    [categories, initialIds],
  );

  const selected = useMemo(
    () => categories.filter((c) => selectedIds.includes(c.id)),
    [categories, selectedIds],
  );
  const available = useMemo(() => availableVariants(selected), [selected]);
  const variant = pickVariant(variantChoice ?? lastVariant, available);
  const totalWords = selected.reduce((sum, c) => sum + c.wordCount, 0);
  const tooFew = selected.length > 0 && tooFewWordsFor(totalWords, duration);

  const durationOptions = useMemo(
    () => DURATIONS.map((value) => ({ value, label: t('setup.seconds', { count: value }) })),
    [t],
  );

  const toggle = (id: number) => {
    feedback('select');
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const start = async () => {
    if (selected.length === 0) return;
    setStarting(true);
    try {
      const ids = selected.map((c) => c.id);
      const [cards, recentlySeen] = await Promise.all([
        getCategoryCards(db, ids),
        recentlySeenWords(db, ids),
      ]);
      // Variante et durée choisies deviennent celles par défaut (UX.md §3).
      updateSettings({ defaultDuration: duration, lastVariant: variant });
      prepare({
        categories: selected,
        cards,
        durationMs: duration * 1000,
        variant,
        available,
        recentlySeen,
      });
      router.push('/play/ready');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.fill}>
      <Screen scroll>
        <Text variant="display" accessibilityRole="header">
          {t('screens.playSetup')}
        </Text>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('setup.variant')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.variants}
            accessibilityHint={t('setup.variantsHint')}
          >
            {available.map((id) => {
              const isSelected = id === variant;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    feedback('select');
                    setVariantChoice(id);
                  }}
                  style={[styles.variantCard, isSelected && styles.variantSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(`variants.${id}.name`)}. ${t(`variants.${id}.instruction`)}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <VariantIcon variant={id} size={52} active={isSelected} />
                  {/* Une ligne, réduite si besoin : jamais de coupure au milieu d'un mot. */}
                  <Text
                    variant="label"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {t(`variants.${id}.name`)}
                  </Text>
                  <Text variant="caption" muted numberOfLines={3}>
                    {t(`variants.${id}.instruction`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('setup.duration')}
          </Text>
          <SegmentedControl
            options={durationOptions}
            value={duration}
            onChange={setDuration}
            accessibilityLabel={t('setup.duration')}
          />
        </View>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('setup.category')}
          </Text>
          <Text variant="caption" muted>
            {t('setup.categoryHint')}
          </Text>
          <View style={styles.grid} collapsable={false}>
            {ordered.map((category, index) => {
              const isSelected = selectedIds.includes(category.id);
              return (
                <Animated.View
                  key={category.id}
                  entering={rise({ delay: staggerDelay(index) ?? 0, reduced })}
                  style={[styles.gridItem, isSelected && styles.selected]}
                  accessibilityState={{ selected: isSelected }}
                >
                  <CategoryCard
                    category={category}
                    selected={isSelected}
                    onPress={() => toggle(category.id)}
                  />
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Screen>

      {/* Pied fixe : le départ reste à portée, quelle que soit la longueur de la grille. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {selected.length === 0 ? (
          <Text variant="labelSmall" muted>
            {t('setup.noCategory')}
          </Text>
        ) : (
          <Text variant="labelSmall" accessibilityLiveRegion="polite">
            {t('setup.selected', { count: selected.length, words: totalWords })}
          </Text>
        )}
        {tooFew ? (
          <View style={styles.warning} accessibilityLiveRegion="polite">
            <Icon icon={InfoIcon} size={18} color={colors.sun} />
            <Text variant="caption" style={styles.flex}>
              {t('setup.tooFewWords')}
            </Text>
          </View>
        ) : null}
        <Button
          label={t('setup.start')}
          size="lg"
          block
          loading={starting}
          disabled={selected.length === 0}
          onPress={() => void start()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond explicite : une vue sans propriété visuelle est aplatie par Fabric (voir Mes catégories).
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  section: { gap: spacing.md },
  // Le carrousel déborde volontairement des marges pour défiler jusqu'au bord.
  bleed: { marginHorizontal: -spacing.xl },
  variants: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  variantCard: {
    width: VARIANT_CARD_WIDTH,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: colors.hairline,
  },
  // Sélection : contour blanc cassé (et icône animée), jamais la couleur seule.
  variantSelected: { borderColor: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%', borderRadius: radii.card + 4, padding: 2 },
  selected: { backgroundColor: colors.text },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  warning: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
