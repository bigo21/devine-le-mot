import { Image } from 'expo-image';
import { Text } from 'react-native';

import { type CategoryIconName, categoryIcons, emojiIcons } from '@/assets/categories';

type Props = (
  { name: CategoryIconName; emoji?: never } | { emoji: string | null; name?: never }
) & {
  size?: number;
};

/**
 * Icône de catégorie ou de région (Fluent Emoji 3D). Avec `emoji`, l'icône Fluent correspondante
 * est affichée ; à défaut (paquet importé), l'emoji système (docs/ASSETS.md §3).
 * Décorative : le titre voisin porte le sens.
 */
export function CategoryIcon({ name, emoji, size = 40 }: Props) {
  const icon = name ?? (emoji ? emojiIcons[emoji.replace(/️/g, '')] : undefined);

  if (!icon) {
    return emoji ? (
      <Text
        style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: 'center' }}
        accessible={false}
        maxFontSizeMultiplier={1}
      >
        {emoji}
      </Text>
    ) : null;
  }

  return (
    <Image
      source={categoryIcons[icon]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );
}
