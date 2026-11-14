import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { CopySimpleIcon } from 'phosphor-react-native/src/icons/CopySimple';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { VariantIcon } from '@/features/game/components/variant-icon';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { availableVariants } from '@/features/game/variants';
import { takeHandedOffCategory } from '@/features/packs/category-handoff';
import { sharePackFile } from '@/features/packs/files';
import {
  type CategorySummary,
  exportPackOf,
  getCategory,
  previewWords,
  setFavorite,
} from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import { Button, CategoryIcon, Icon, NdopPattern, Screen, Text } from '@/ui/components';
import {
  pop,
  rise,
  staggerDelay,
  takeZoomOrigin,
  useReducedMotion,
  useZoomFrom,
} from '@/ui/motion';
import { colors, onColor, patternOpacity, radii, spacing } from '@/ui/tokens';

/** Mots montrés : un échantillon seulement, pour ne pas gâcher la partie. */
const SAMPLE_SIZE = 12;

/** Détail d'une catégorie (PROJET.md §3, DESIGN.md §4) : aperçu, variantes, actions. */
export default function CategoryDetailScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  // Arrivée depuis une carte de la grille : le bandeau part de la carte touchée (zoom).
  const [origin] = useState(() => takeZoomOrigin(`category-${id}`));
  const {
    ref: zoomRef,
    onLayout: onZoomLayout,
    style: zoomStyle,
    active: zooming,
    started: zoomStarted,
  } = useZoomFrom(origin, reduced);

  // Venue de la grille : la catégorie est déjà connue, l'écran s'affiche sans attendre la base.
  const [category, setCategory] = useState<CategorySummary | null | undefined>(() =>
    takeHandedOffCategory(categoryId),
  );
  const [sample, setSample] = useState<string[]>([]);
  const [shuffles, setShuffles] = useState(0);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([
        getCategory(db, categoryId, i18n.language),
        previewWords(db, categoryId, SAMPLE_SIZE),
      ]).then(([found, words]) => {
        if (!active) return;
        setCategory(found);
        setSample(words);
      });
      return () => {
        active = false;
      };
    }, [db, categoryId, i18n.language]),
  );

  if (category === undefined) return <Screen>{null}</Screen>;
  if (category === null) {
    return (
      <Screen>
        <Text muted>{t('categoryDetail.notFound')}</Text>
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const builtin = category.source === 'builtin';
  const foreground = onColor(category.color);
  const region =
    category.region === 'custom'
      ? t('categoryDetail.regionCustom')
      : t(`categoriesScreen.regions.${category.region}`);

  const toggleFavorite = async () => {
    const favorite = !category.favorite;
    feedback('select');
    await setFavorite(db, category.id, favorite);
    setCategory({ ...category, favorite });
  };

  const shuffle = async () => {
    feedback('select');
    setSample(await previewWords(db, category.id, SAMPLE_SIZE));
    setShuffles((n) => n + 1);
  };

  const share = async () => {
    setSharing(true);
    try {
      const file = await exportPackOf(db, category.id);
      if (file) await sharePackFile(file, t('myCategories.shareTitle', { name: category.name }));
    } catch {
      // Feuille de partage refusée ou déjà ouverte : rien à faire, l'utilisateur peut réessayer.
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen scroll>
      <Animated.View
        ref={zoomRef}
        onLayout={onZoomLayout}
        entering={zooming ? undefined : pop({ reduced })}
        style={[styles.hero, { backgroundColor: colors[category.color] }, zoomStyle]}
      >
        <NdopPattern color={foreground} opacity={patternOpacity.card} />
        <CategoryIcon emoji={category.emoji} size={88} />
        <Text variant="display" color={foreground} accessibilityRole="header">
          {category.name}
        </Text>
        <Text variant="label" color={foreground}>
          {t('categoryDetail.words', { count: category.wordCount })} · {region}
        </Text>
      </Animated.View>

      {/* Le reste de l'écran entre une fois le zoom parti : sinon son entrée se jouerait avant
          que l'écran soit visible. */}
      {zoomStarted ? (
        <>
          <Animated.View entering={rise({ delay: 80, reduced })} style={styles.actions}>
            <Button
              label={t('categoryDetail.play')}
              size="lg"
              block
              icon={<Icon icon={PlayIcon} emphasis />}
              onPress={() =>
                router.push({ pathname: '/play/setup', params: { category: String(category.id) } })
              }
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  label={
                    category.favorite
                      ? t('categoriesScreen.removeFavorite')
                      : t('categoriesScreen.addFavorite')
                  }
                  variant="secondary"
                  block
                  icon={<Icon icon={StarIcon} emphasis={category.favorite} />}
                  onPress={() => void toggleFavorite()}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  label={builtin ? t('categoriesScreen.duplicate') : t('categoriesScreen.edit')}
                  variant="ghost"
                  block
                  icon={<Icon icon={builtin ? CopySimpleIcon : PencilSimpleIcon} />}
                  onPress={() =>
                    router.push({
                      pathname: '/create/editor',
                      params: builtin
                        ? { duplicate: String(category.id) }
                        : { id: String(category.id) },
                    })
                  }
                />
              </View>
              {!builtin ? (
                <View style={styles.flex}>
                  <Button
                    label={t('myCategories.share')}
                    variant="ghost"
                    block
                    loading={sharing}
                    icon={<Icon icon={ShareNetworkIcon} />}
                    onPress={() => void share()}
                  />
                </View>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={rise({ delay: 160, reduced })} style={styles.section}>
            <Text variant="heading" accessibilityRole="header">
              {t('categoryDetail.variants')}
            </Text>
            <View style={styles.variants}>
              {availableVariants([category]).map((variant) => (
                <View key={variant} style={styles.variant}>
                  <VariantIcon variant={variant} size={36} />
                  <Text variant="caption" align="center" numberOfLines={2}>
                    {t(`variants.${variant}.name`)}
                  </Text>
                </View>
              ))}
            </View>
            {category.forbiddenEligible > 0 ? (
              <Text variant="caption" muted>
                {t('categoryDetail.forbidden', { count: category.forbiddenEligible })}
              </Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={rise({ delay: 240, reduced })} style={styles.section}>
            <Text variant="heading" accessibilityRole="header">
              {t('categoryDetail.sample')}
            </Text>
            <Text variant="caption" muted>
              {t('categoryDetail.spoiler')}
            </Text>
            <View style={styles.words}>
              {sample.map((word, index) => (
                <Animated.View
                  key={`${shuffles}-${word}`}
                  entering={pop({ delay: staggerDelay(index) ?? 0, reduced })}
                  style={styles.word}
                >
                  <Text variant="labelSmall">{word}</Text>
                </Animated.View>
              ))}
            </View>
            {category.wordCount > SAMPLE_SIZE ? (
              <Button
                label={t('categoryDetail.shuffle')}
                variant="ghost"
                icon={<Icon icon={ArrowsClockwiseIcon} />}
                onPress={() => void shuffle()}
              />
            ) : null}
          </Animated.View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Trois par ligne : les noms longs tiennent sur deux lignes sans couper un mot.
  variant: { width: '30%', alignItems: 'center', gap: spacing.xs },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  word: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElevated,
  },
});
