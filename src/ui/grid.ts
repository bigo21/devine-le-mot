import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from './tokens';

/** Largeurs de fenêtre (dp) des classes Material 3 : compacte, moyenne, étendue. */
const MEDIUM = 600;
const EXPANDED = 840;

/** Colonnes d'une grille de cartes selon la largeur : 2 sur téléphone, 3 puis 4 sur tablette. */
export function gridColumns(width: number): number {
  if (width >= EXPANDED) return 4;
  if (width >= MEDIUM) return 3;
  return 2;
}

/** Largeur d'une carte pour `columns` colonnes séparées de `gap`, dans `available` dp. */
export function gridItemWidth(available: number, columns: number, gap: number): number {
  return Math.floor((available - gap * (columns - 1)) / columns);
}

/**
 * Grille de cartes d'un écran aux marges standard (`Screen`) : colonnes et largeur des cartes.
 * Une dernière rangée incomplète reste alignée à gauche (largeur fixe + espacement).
 */
export function useCardGrid() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gap = spacing.md;
  const available = width - insets.left - insets.right - spacing.xl * 2;
  const columns = gridColumns(available);
  return { columns, gap, itemWidth: gridItemWidth(available, columns, gap) };
}
