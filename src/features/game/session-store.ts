import { create } from 'zustand';

import type { CategorySummary } from '@/features/packs/repository';

import { type Card, createRound, type Random, type RoundState } from './engine';

/** Partie en cours, partagée entre les écrans du parcours (non persistée). */
type GameSession = {
  category: CategorySummary | null;
  cards: readonly Card[];
  durationMs: number;
  round: RoundState | null;
  /** La manche terminée a-t-elle été enregistrée (historique, mots vus) ? */
  recorded: boolean;
  /** Prépare une manche (mots non vus récemment d'abord). */
  prepare: (options: {
    category: CategorySummary;
    cards: readonly Card[];
    durationMs: number;
    recentlySeen?: ReadonlySet<number>;
    random?: Random;
  }) => void;
  setRound: (round: RoundState) => void;
  markRecorded: () => void;
};

export const useGameSession = create<GameSession>()((set) => ({
  category: null,
  cards: [],
  durationMs: 60_000,
  round: null,
  recorded: false,
  prepare: ({ category, cards, durationMs, recentlySeen, random = Math.random }) =>
    set({
      category,
      cards,
      durationMs,
      recorded: false,
      round: createRound({ cards, durationMs, recentlySeen, random }),
    }),
  setRound: (round) => set({ round }),
  markRecorded: () => set({ recorded: true }),
}));
