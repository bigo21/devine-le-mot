import { create } from 'zustand';

import type { CategorySummary } from '@/features/packs/repository';

import { type Card, createRound, type Random, type RoundState } from './engine';
import { cardsForVariant, type VariantId } from './variants';

/** Partie en cours, partagée entre les écrans du parcours (non persistée). */
type GameSession = {
  /** Catégories de la manche (une ou plusieurs, mélangées). */
  categories: readonly CategorySummary[];
  /** Tous les mots des catégories ; la manche n'en garde que ceux de la variante. */
  cards: readonly Card[];
  durationMs: number;
  variant: VariantId;
  /** Variantes proposées pour la sélection (tirage du Mix). */
  available: readonly VariantId[];
  round: RoundState | null;
  /** La manche terminée a-t-elle été enregistrée (historique, mots vus) ? */
  recorded: boolean;
  /** Prépare une manche (mots non vus récemment d'abord). */
  prepare: (options: {
    categories: readonly CategorySummary[];
    cards: readonly Card[];
    durationMs: number;
    variant: VariantId;
    available: readonly VariantId[];
    recentlySeen?: ReadonlySet<number>;
    random?: Random;
  }) => void;
  /** Nouvelle manche, mêmes réglages (Rejouer, Recommencer, équipe suivante). */
  again: (options?: { recentlySeen?: ReadonlySet<number>; random?: Random }) => void;
  setRound: (round: RoundState) => void;
  markRecorded: () => void;
};

export const useGameSession = create<GameSession>()((set, get) => ({
  categories: [],
  cards: [],
  durationMs: 60_000,
  variant: 'classic',
  available: ['classic'],
  round: null,
  recorded: false,
  prepare: ({ recentlySeen, random = Math.random, ...options }) =>
    set({
      ...options,
      recorded: false,
      round: createRound({
        cards: cardsForVariant(options.cards, options.variant),
        durationMs: options.durationMs,
        recentlySeen,
        random,
      }),
    }),
  again: ({ recentlySeen, random = Math.random } = {}) => {
    const { cards, variant, durationMs } = get();
    set({
      recorded: false,
      round: createRound({
        cards: cardsForVariant(cards, variant),
        durationMs,
        recentlySeen,
        random,
      }),
    });
  },
  setRound: (round) => set({ round }),
  markRecorded: () => set({ recorded: true }),
}));
