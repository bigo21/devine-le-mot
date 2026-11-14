import type { WordFont } from '@/ui/tokens';

/**
 * Largeur moyenne d'un caractère, en fraction de la taille de police (graisse 800, avec marge).
 * Unbounded est très large ; Atkinson Hyperlegible Next beaucoup moins.
 */
export const CHAR_RATIO: Record<WordFont, number> = { expressive: 0.8, readable: 0.64 };

/** En dessous, le mot ne se lit plus à 1 mètre : l'auto-fit natif prend le relais. */
const MIN_SIZE = 28;
/** Interligne relatif du mot. */
const LINE_HEIGHT = 1.1;

/**
 * Taille de départ du mot en jeu (UX.md §5 « Mot très long ») : le mot le plus long doit tenir
 * sur une seule ligne. Android coupe au milieu d'un mot plutôt que de réduire la police, donc on
 * ne laisse à l'auto-fit natif que la réduction en hauteur (deux lignes au plus).
 */
export function wordFontSize(
  text: string,
  width: number,
  options: { base: number; font: WordFont },
): { fontSize: number; lineHeight: number } {
  const longest = text
    .trim()
    .split(/\s+/)
    .reduce((max, token) => Math.max(max, [...token].length), 0);
  const fitting =
    longest > 0 && width > 0 ? width / (longest * CHAR_RATIO[options.font]) : options.base;
  const fontSize = Math.max(MIN_SIZE, Math.min(options.base, Math.floor(fitting)));
  return { fontSize, lineHeight: Math.round(fontSize * LINE_HEIGHT) };
}
