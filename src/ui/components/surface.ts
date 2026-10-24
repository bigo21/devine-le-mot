import { createContext, useContext } from 'react';

import { colors } from '@/ui/tokens';

/** Couleur de premier plan de la surface courante (texte, icônes, motif). */
export const SurfaceContext = createContext<{ foreground: string; muted: string }>({
  foreground: colors.text,
  muted: colors.textMuted,
});

export function useSurface() {
  return useContext(SurfaceContext);
}
