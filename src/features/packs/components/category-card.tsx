import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, CategoryIcon, Icon, Text } from '@/ui/components';

import type { CategorySummary } from '../repository';

/** Hauteur unique des cartes de catégorie : icône, titre sur 2 lignes au plus, nombre de mots. */
export const CATEGORY_CARD_HEIGHT = 156;

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
  const label = category.favorite
    ? `${category.name}, ${t('categoriesScreen.favorite')}`
    : category.name;

  return (
    <Card
      accent={category.color}
      style={styles.card}
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
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          android_hyphenationFrequency="normal"
        >
          {category.name}
        </Text>
      </View>
      <Text variant="labelSmall" numberOfLines={1}>
        {t('categoriesScreen.words', { count: category.wordCount })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { height: CATEGORY_CARD_HEIGHT },
  content: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  // Le titre occupe l'espace restant : la position du nombre de mots ne bouge jamais.
  title: { flex: 1, justifyContent: 'flex-end' },
});
