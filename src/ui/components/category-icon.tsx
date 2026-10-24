import { Image } from 'expo-image';

import { type CategoryIconName, categoryIcons } from '@/assets/categories';

type Props = {
  name: CategoryIconName;
  size?: number;
};

/** Icône de catégorie ou de région (Fluent Emoji 3D). Décorative : le titre voisin porte le sens. */
export function CategoryIcon({ name, size = 40 }: Props) {
  return (
    <Image
      source={categoryIcons[name]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );
}
