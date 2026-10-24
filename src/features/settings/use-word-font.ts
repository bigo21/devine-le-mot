import { wordFonts } from '@/ui/tokens';

import { useSettings } from './store';

/** Style de police du mot en jeu, selon le réglage « Police du mot ». */
export function useWordFont() {
  return wordFonts[useSettings((s) => s.wordFont)];
}
