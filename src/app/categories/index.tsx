import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CopySimpleIcon } from 'phosphor-react-native/src/icons/CopySimple';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { type ComponentRef, type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { handOffCategory } from '@/features/packs/category-handoff';
import { pickingIds, setPicked } from '@/features/packs/category-picker';
import { CategoryCard } from '@/features/packs/components/category-card';
import { type CategoryFilter, categoryFilters, filterCategories } from '@/features/packs/filter';
import {
  type CategorySummary,
  listCategories,
  previewWords,
  setFavorite,
} from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import {
  BottomSheet,
  Button,
  CategoryIcon,
  Chip,
  Flag,
  Icon,
  KeyboardScreen,
  Screen,
  Text,
} from '@/ui/components';
import { fadeOut, rise, setZoomOrigin, staggerDelay, useReducedMotion } from '@/ui/motion';
import { colors, maxFontScale, radii, spacing, touchTarget, typography } from '@/ui/tokens';

/** Icône de chaque pilule : drapeau pour un pays, Fluent 3D sinon (docs/ASSETS.md §1). */
const FILTER_ICONS: Record<CategoryFilter, ReactNode> = {
  all: null,
  cm: <Flag code="cm" />,
  africa: <CategoryIcon name="region-africa" size={20} />,
  fr: <Flag code="fr" />,
  us: <Flag code="us" />,
  world: <CategoryIcon name="region-world" size={20} />,
  party: <CategoryIcon name="region-party" size={20} />,
  mine: <CategoryIcon name="region-mine" size={20} />,
};

export default function CategoriesScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  // Mode sélection (ouvert depuis la préparation) : toucher une carte l'ajoute ou la retire.
  const picking = useLocalSearchParams<{ pick?: string }>().pick === '1';
  const [pickedIds, setPickedIds] = useState<number[]>(() => (picking ? pickingIds() : []));

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<{ category: CategorySummary; words: string[] } | null>(
    null,
  );

  const reload = useCallback(
    () => listCategories(db, i18n.language).then(setCategories),
    [db, i18n.language],
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const visible = useMemo(
    () => filterCategories(categories, filter, query),
    [categories, filter, query],
  );

  const togglePicked = (id: number) => {
    feedback('select');
    setPickedIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      setPicked(next);
      return next;
    });
  };
  const pickedCategories = categories.filter((c) => pickedIds.includes(c.id));
  const pickedWords = pickedCategories.reduce((sum, c) => sum + c.wordCount, 0);

  const openPreview = async (category: CategorySummary) => {
    const words = await previewWords(db, category.id);
    setPreview({ category, words });
  };

  const toggleFavorite = async () => {
    if (!preview) return;
    const favorite = !preview.category.favorite;
    feedback('select');
    await setFavorite(db, preview.category.id, favorite);
    setPreview({ ...preview, category: { ...preview.category, favorite } });
    await reload();
  };

  const play = (category: CategorySummary) => {
    setPreview(null);
    router.push({ pathname: '/play/setup', params: { category: String(category.id) } });
  };

  // Catégorie du jeu : en lecture seule, on la duplique (GAMEPLAY.md §5) ; sinon on la modifie.
  const edit = (category: CategorySummary) => {
    setPreview(null);
    router.push({
      pathname: '/create/editor',
      params:
        category.source === 'builtin'
          ? { duplicate: String(category.id) }
          : { id: String(category.id) },
    });
  };

  return (
    <View style={styles.fill}>
      <Container
        picking={picking}
        footer={
          <>
            <Text variant="labelSmall" accessibilityLiveRegion="polite">
              {pickedCategories.length === 0
                ? t('setup.noCategory')
                : t('setup.selected', { count: pickedCategories.length, words: pickedWords })}
            </Text>
            <Button label={t('categoriesScreen.pickDone')} size="lg" block onPress={router.back} />
          </>
        }
      >
        <Text variant="display" accessibilityRole="header">
          {picking ? t('categoriesScreen.pickTitle') : t('screens.categories')}
        </Text>

        <View style={styles.search}>
          <Icon icon={MagnifyingGlassIcon} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('categoriesScreen.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.mango}
            cursorColor={colors.mango}
            style={styles.searchInput}
            maxFontSizeMultiplier={maxFontScale}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={t('categoriesScreen.searchPlaceholder')}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('categoriesScreen.clearSearch')}
            >
              <Icon icon={XIcon} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}
          accessibilityLabel={t('categoriesScreen.filters')}
        >
          {categoryFilters.map((key) => (
            <Chip
              key={key}
              label={t(`categoriesScreen.regions.${key}`)}
              icon={FILTER_ICONS[key]}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </ScrollView>

        {visible.length > 0 ? (
          <>
            <View style={styles.grid}>
              {visible.map((category, index) => (
                <GridItem
                  key={`${filter}-${category.id}`}
                  category={category}
                  delay={staggerDelay(index) ?? 0}
                  reduced={reduced}
                  picked={picking ? pickedIds.includes(category.id) : undefined}
                  onPick={picking ? () => togglePicked(category.id) : undefined}
                  onLongPress={() => void openPreview(category)}
                />
              ))}
            </View>
            <Text variant="caption" muted>
              {picking ? t('categoriesScreen.pickHint') : t('categoriesScreen.hint')}
            </Text>
          </>
        ) : (
          <View style={styles.empty}>
            <Text muted>
              {filter === 'mine' && !query
                ? t('categoriesScreen.emptyMine')
                : t('categoriesScreen.emptySearch')}
            </Text>
            <Button
              label={t('categoriesScreen.create')}
              variant="secondary"
              onPress={() => router.push('/create/editor')}
            />
            {filter === 'mine' ? (
              <Button
                label={t('categoriesScreen.import')}
                variant="ghost"
                onPress={() => router.push('/create')}
              />
            ) : null}
          </View>
        )}
      </Container>

      <BottomSheet
        visible={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.category.name}
      >
        {preview ? (
          <>
            <Text variant="labelSmall" muted>
              {t('categoriesScreen.preview')}
            </Text>
            <View style={styles.words}>
              {preview.words.map((word) => (
                <View key={word} style={styles.word}>
                  <Text variant="labelSmall">{word}</Text>
                </View>
              ))}
            </View>
            {picking ? (
              <Button
                label={
                  pickedIds.includes(preview.category.id)
                    ? t('categoriesScreen.pickRemove')
                    : t('categoriesScreen.pickAdd')
                }
                size="lg"
                block
                icon={
                  <Icon
                    icon={pickedIds.includes(preview.category.id) ? MinusIcon : PlusIcon}
                    emphasis
                  />
                }
                onPress={() => {
                  togglePicked(preview.category.id);
                  setPreview(null);
                }}
              />
            ) : (
              <Button
                label={t('categoriesScreen.play')}
                size="lg"
                block
                icon={<Icon icon={PlayIcon} emphasis />}
                onPress={() => play(preview.category)}
              />
            )}
            <Button
              label={
                preview.category.favorite
                  ? t('categoriesScreen.removeFavorite')
                  : t('categoriesScreen.addFavorite')
              }
              variant="secondary"
              block
              icon={<Icon icon={StarIcon} emphasis={preview.category.favorite} />}
              onPress={() => void toggleFavorite()}
            />
            {picking ? null : (
              <Button
                label={
                  preview.category.source === 'builtin'
                    ? t('categoriesScreen.duplicate')
                    : t('categoriesScreen.edit')
                }
                variant="ghost"
                block
                icon={
                  <Icon
                    icon={preview.category.source === 'builtin' ? CopySimpleIcon : PencilSimpleIcon}
                  />
                }
                onPress={() => edit(preview.category)}
              />
            )}
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}

type GridItemProps = {
  category: CategorySummary;
  delay: number;
  reduced: boolean;
  /** Mode sélection : carte choisie ou non (contour et coche, jamais la couleur seule). */
  picked?: boolean;
  /** Mode sélection : le toucher ajoute ou retire la carte au lieu d'ouvrir le détail. */
  onPick?: () => void;
  onLongPress: () => void;
};

/** Carte de la grille : au toucher, on mémorise sa place pour que le détail en parte (zoom). */
/** Conteneur : pied fixe « Valider » en mode sélection, écran défilant simple sinon. */
function Container({
  picking,
  footer,
  children,
}: {
  picking: boolean;
  footer: ReactNode;
  children: ReactNode;
}) {
  if (picking) return <KeyboardScreen footer={footer}>{children}</KeyboardScreen>;
  return <Screen scroll>{children}</Screen>;
}

function GridItem({ category, delay, reduced, picked, onPick, onLongPress }: GridItemProps) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const open = () => {
    const go = () =>
      router.push({ pathname: '/categories/[id]', params: { id: String(category.id) } });
    const view = ref.current;
    handOffCategory(category);
    if (!view) return go();
    view.measureInWindow((x, y, width, height) => {
      if (width > 0) setZoomOrigin(`category-${category.id}`, { x, y, width, height });
      go();
    });
  };
  return (
    <Animated.View
      ref={ref}
      entering={rise({ delay, reduced })}
      exiting={fadeOut}
      style={[styles.gridItem, onPick && styles.pickable, picked && styles.picked]}
      accessibilityState={onPick ? { selected: picked === true } : undefined}
    >
      <CategoryCard
        category={category}
        selected={picked === true}
        onPress={onPick ?? open}
        onLongPress={onLongPress}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  search: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  // La rangée de pilules déborde volontairement des marges pour défiler jusqu'au bord.
  filtersScroll: { marginHorizontal: -spacing.xl },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%' },
  // Mode sélection : même contour que la préparation (anneau blanc cassé autour de la carte).
  pickable: { borderRadius: radii.card + 4, padding: 2 },
  picked: { backgroundColor: colors.text },
  empty: { gap: spacing.md, alignItems: 'flex-start', marginTop: spacing.lg },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  word: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSunken,
  },
});
