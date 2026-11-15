import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Card, CategoryIcon, Icon, Text } from '@/ui/components';
import { maxFontScale } from '@/ui/tokens';

import type { CategorySummary } from '../repository';

/**
 * Hauteur unique des cartes de catégorie : marges (32) + icône (44) + espaces (16) + titre sur
 * 3 lignes (66) + nombre de mots (18). Le titre garde toujours la même taille : une taille
 * réduite au cas par cas rendait les titres longs bien plus petits que leurs voisins.
 */
export const CATEGORY_CARD_HEIGHT = 176;
/** Le nombre de mots grandit moins que le titre : il reste secondaire. */
const COUNT_MAX_FONT_SCALE = 1.25;

type Props = {
  category: CategorySummary;
  onPress: () => void;
  onLongPress?: () => void;
  /** Carte choisie (écran de préparation) : coche en haut à droite. */
  selected?: boolean;
};

/** Carte de catégorie : mêmes dimensions partout (grille de l'écran Catégories, préparation). */
export function CategoryCard({ category, onPress, onLongPress, selected = false }: Props) {
  const { t } = useTranslation();
  // En grande police, la carte grandit avec la police (le titre garde ses 3 lignes).
  const fontScale = Math.min(useWindowDimensions().fontScale, maxFontScale);
  const height = CATEGORY_CARD_HEIGHT * Math.max(1, fontScale);
  const label = category.favorite
    ? `${category.name}, ${t('categoriesScreen.favorite')}`
    : category.name;

  return (
    <Card
      accent={category.color}
      style={{ height }}
      contentStyle={styles.content}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={label}
    >
      <View style={styles.top}>
        <CategoryIcon emoji={category.emoji} size={44} />
        {selected ? (
          <Icon icon={CheckIcon} size={22} />
        ) : category.favorite ? (
          <Icon icon={StarIcon} size={20} emphasis />
        ) : null}
      </View>
      <View style={styles.title}>
        <Text
          variant="subheading"
          numberOfLines={3}
          android_hyphenationFrequency="normal"
        >
          {category.name}
        </Text>
      </View>
      <Text variant="labelSmall" numberOfLines={1} maxFontSizeMultiplier={COUNT_MAX_FONT_SCALE}>
        {t('categoriesScreen.words', { count: category.wordCount })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  // Le titre occupe l'espace restant : la position du nombre de mots ne bouge jamais.
  title: { flex: 1, justifyContent: 'flex-end' },
});
