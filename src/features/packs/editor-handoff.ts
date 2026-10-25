// Relais d'une liste de mots (collée à l'import ou reçue d'une autre app) vers l'éditeur, sans la
// faire passer dans les paramètres d'URL. Rien n'est persisté.
import { create } from 'zustand';

type Handoff = {
  text: string | null;
  give: (text: string) => void;
  /** Rend la liste en attente et la vide (lue une seule fois). */
  take: () => string | null;
};

export const useEditorHandoff = create<Handoff>((set, get) => ({
  text: null,
  give: (text) => set({ text }),
  take: () => {
    const { text } = get();
    set({ text: null });
    return text;
  },
}));
