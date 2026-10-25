import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useOrientationLock } from '@/features/game/use-orientation-lock';
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
  Card,
  CategoryIcon,
  Chip,
  Flag,
  Icon,
  Screen,
  Text,
} from '@/ui/components';
import { fadeOut, rise, staggerDelay, useReducedMotion } from '@/ui/motion';
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

  return (
    <View style={styles.fill}>
      <Screen scroll>
        <Text variant="display" accessibilityRole="header">
          {t('screens.categories')}
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
                <Animated.View
                  key={`${filter}-${category.id}`}
                  entering={rise({ delay: staggerDelay(index) ?? 0, reduced })}
                  exiting={fadeOut}
                  style={styles.gridItem}
                >
                  <Card
                    accent={category.color}
                    style={styles.card}
                    onPress={() => play(category)}
                    onLongPress={() => void openPreview(category)}
                    accessibilityLabel={
                      category.favorite
                        ? `${category.name}, ${t('categoriesScreen.favorite')}`
                        : category.name
                    }
                  >
                    <View style={styles.cardTop}>
                      <CategoryIcon emoji={category.emoji} size={44} />
                      {category.favorite ? <Icon icon={StarIcon} size={20} emphasis /> : null}
                    </View>
                    <Text variant="subheading" android_hyphenationFrequency="normal">
                      {category.name}
                    </Text>
                    <Text variant="labelSmall">
                      {t('categoriesScreen.words', { count: category.wordCount })}
                    </Text>
                  </Card>
                </Animated.View>
              ))}
            </View>
            <Text variant="caption" muted>
              {t('categoriesScreen.hint')}
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
      </Screen>

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
            <Button
              label={t('categoriesScreen.play')}
              size="lg"
              block
              icon={<Icon icon={PlayIcon} emphasis />}
              onPress={() => play(preview.category)}
            />
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
          </>
        ) : null}
      </BottomSheet>
    </View>
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
  card: { minHeight: 132, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empty: { gap: spacing.md, alignItems: 'flex-start', marginTop: spacing.lg },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  word: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSunken,
  },
});
