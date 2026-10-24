// Presets de mouvement de docs/DESIGN.md §3. Aucune durée ni valeur de ressort en dur ailleurs.
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** Courbes : jamais d'ease-in sur l'UI. */
export const easing = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  breathe: Easing.inOut(Easing.sin),
} as const;

export const spring = {
  /** Boutons, chips. */
  snappy: { damping: 18, stiffness: 260, mass: 1 },
  /** Apparition de cartes, score. */
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
  /** Sheets, transitions de page. */
  gentle: { damping: 22, stiffness: 120, mass: 1 },
} as const satisfies Record<string, WithSpringConfig>;

export const timing = {
  /** Flashs, fondus. */
  fast: { duration: 150, easing: easing.out },
  /** Transitions standard. */
  base: { duration: 280, easing: easing.out },
} as const satisfies Record<string, WithTimingConfig>;

export { motion } from './constants';
