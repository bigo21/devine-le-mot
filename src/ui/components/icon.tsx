import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { useSurface } from './surface';

type Props = {
  /** Icône Phosphor importée seule : `import { PlayIcon } from 'phosphor-react-native/src/icons/Play'`. */
  icon: PhosphorIcon;
  size?: number;
  /** `bold` partout ; `duotone` pour une icône mise en avant (docs/ASSETS.md §1). */
  emphasis?: boolean;
  /** Couleur explicite ; par défaut, celle de la surface courante (texte `on<Couleur>` compris). */
  color?: string;
};

/** Icône d'interface : une seule famille (Phosphor), décorative (le libellé voisin porte le sens). */
export function Icon({ icon: Glyph, size = 20, emphasis = false, color }: Props) {
  const surface = useSurface();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Glyph
        size={size}
        weight={emphasis ? 'duotone' : 'bold'}
        color={color ?? surface.foreground}
      />
    </View>
  );
}
