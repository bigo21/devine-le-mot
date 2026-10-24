import { create } from 'zustand';

import { type Random, type RoundState, createRound } from './engine';
import { findTestCategory } from './test-categories';

/** Partie en cours, partagée entre les écrans du parcours (non persistée). */
type GameSession = {
  categoryId: string | null;
  durationMs: number;
  round: RoundState | null;
  /** Prépare une nouvelle manche (mots différents grâce au tirage). */
  prepare: (options: { categoryId: string; durationMs: number; random?: Random }) => void;
  setRound: (round: RoundState) => void;
  clear: () => void;
};

export const useGameSession = create<GameSession>()((set) => ({
  categoryId: null,
  durationMs: 60_000,
  round: null,
  prepare: ({ categoryId, durationMs, random = Math.random }) => {
    const category = findTestCategory(categoryId);
    if (!category) return;
    set({
      categoryId,
      durationMs,
      round: createRound({ cards: category.cards, durationMs, random }),
    });
  },
  setRound: (round) => set({ round }),
  clear: () => set({ round: null }),
}));
