// Variantes de jeu (docs/GAMEPLAY.md §3) : définitions et règles de compatibilité, logique pure.
// Noms et consignes sont dans l'i18n (`variants.<id>`), icônes animées dans VariantIcon.
import type { VariantId } from '@/features/packs/schema';
import type { AccentColor } from '@/ui/tokens';

import type { Card, Random } from './engine';

export type { VariantId };

/** Ordre d'affichage du carrousel ; Classique en premier, Mix en dernier. */
export const variantOrder: readonly VariantId[] = [
  'classic',
  'mime',
  'sounds',
  'one-word',
  'sing',
  'forbidden',
  'air-draw',
  'imitation',
  'mix',
];

/** Couleur d'accent de chaque variante (pastille de l'icône, carte du carrousel). */
export const variantAccent: Record<VariantId, AccentColor> = {
  classic: 'lagoon',
  mime: 'hibiscus',
  sounds: 'sun',
  'one-word': 'teal',
  sing: 'orchid',
  forbidden: 'clay',
  'air-draw': 'indigo',
  imitation: 'mango',
  mix: 'plum',
};

/** Une carte n'est tirée en « Mots interdits » qu'avec au moins 3 mots interdits. */
export const MIN_FORBIDDEN_PER_WORD = 3;
/** « Mots interdits » n'est proposée qu'avec au moins 20 mots éligibles dans la sélection. */
export const MIN_FORBIDDEN_WORDS = 20;
/** Mots interdits affichés sous le mot. */
export const SHOWN_FORBIDDEN = 3;

/** Ce qu'il faut savoir d'une catégorie pour décider des variantes. */
export type VariantSource = {
  /** Champ `variants` de la catégorie : `null` = variantes par défaut. */
  variants: readonly VariantId[] | null;
  /** Mots ayant au moins 3 mots interdits. */
  forbiddenEligible: number;
};

/**
 * Variantes déclarées par une catégorie (hors règle des 20 mots) : absent → toutes sauf
 * Imitation ; présent → la liste donnée. Imitation seulement si elle est déclarée.
 */
export function declaredVariants(variants: readonly VariantId[] | null): VariantId[] {
  if (variants === null) return variantOrder.filter((id) => id !== 'imitation');
  return variantOrder.filter((id) => variants.includes(id));
}

export const isForbiddenEligible = (card: Card) =>
  (card.forbidden?.length ?? 0) >= MIN_FORBIDDEN_PER_WORD;

/**
 * Variantes proposées pour une sélection de catégories : une variante doit être compatible avec
 * toutes les catégories choisies. « Mots interdits » demande en plus 20 mots éligibles au total.
 * Mix est proposé dès qu'au moins deux autres variantes le sont.
 */
export function availableVariants(selection: readonly VariantSource[]): VariantId[] {
  // Rien de choisi : on montre les variantes par défaut (le carrousel n'est jamais vide).
  const sources = selection.length > 0 ? selection : [{ variants: null, forbiddenEligible: 0 }];
  const eligible = sources.reduce((total, s) => total + s.forbiddenEligible, 0);
  const base = variantOrder.filter(
    (id) =>
      id !== 'mix' &&
      sources.every((s) => declaredVariants(s.variants).includes(id)) &&
      (id !== 'forbidden' || eligible >= MIN_FORBIDDEN_WORDS),
  );
  const mixDeclared = sources.every((s) => declaredVariants(s.variants).includes('mix'));
  const result = base.length > 0 ? base : ['classic' as const];
  return mixDeclared && result.length >= 2 ? [...result, 'mix'] : result;
}

/** Variante retenue : la dernière jouée si elle est encore proposée, sinon la première. */
export function pickVariant(preferred: VariantId, available: readonly VariantId[]): VariantId {
  return available.includes(preferred) ? preferred : (available[0] ?? 'classic');
}

/** Cartes jouables pour une variante : « Mots interdits » ne garde que les mots éligibles. */
export function cardsForVariant(cards: readonly Card[], variant: VariantId): Card[] {
  return variant === 'forbidden' ? cards.filter(isForbiddenEligible) : [...cards];
}

/**
 * Variante d'une carte. Hors Mix, c'est la variante de la manche. En Mix, tirage au hasard parmi
 * les variantes proposées pour la manche qui conviennent à cette carte : « Mots interdits »
 * seulement si elle a ses mots interdits, Imitation seulement si sa catégorie la déclare.
 */
export function variantForCard(
  roundVariant: VariantId,
  card: Card,
  options: {
    available: readonly VariantId[];
    /** Variantes déclarées par la catégorie de la carte. */
    declared: readonly VariantId[];
    /** Variante de la carte précédente (évite deux fois de suite la même, si possible). */
    previous?: VariantId | null;
    random: Random;
  },
): VariantId {
  if (roundVariant !== 'mix') return roundVariant;
  const candidates = options.available.filter(
    (id) =>
      id !== 'mix' &&
      options.declared.includes(id) &&
      (id !== 'forbidden' || isForbiddenEligible(card)),
  );
  const fresh = candidates.filter((id) => id !== options.previous);
  const pool = fresh.length > 0 ? fresh : candidates;
  if (pool.length === 0) return 'classic';
  return pool[Math.floor(options.random() * pool.length)] ?? 'classic';
}

/**
 * Catégorie trop petite pour la durée (UX.md §5) : on compte environ un mot toutes les 3 s ; en
 * dessous, on retombe vite sur les mêmes mots.
 */
export function tooFewWordsFor(wordCount: number, durationS: number): boolean {
  return wordCount < Math.ceil(durationS / 3);
}
