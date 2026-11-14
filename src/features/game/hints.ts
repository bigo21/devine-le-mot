// Aides au bon moment (UX.md §4) : logique pure, testable.
import type { PlayedCard } from './engine';
import type { Sensitivity } from '@/features/settings/store';

/** Un mot passé moins de 1,2 s après le précédent n'a sans doute pas été vu : faux déclenchement. */
export const QUICK_PASS_MS = 1200;
/** À partir de 3 passages éclair, formant au moins 40 % des passages, on propose d'ajuster. */
const MIN_QUICK_PASSES = 3;
const MIN_QUICK_RATIO = 0.4;

/** Nombre de mots passés très vite après le mot précédent (le premier mot n'est pas compté). */
export function quickPasses(results: readonly PlayedCard[]): { quick: number; passes: number } {
  let quick = 0;
  let passes = 0;
  results.forEach((entry, i) => {
    if (entry.result !== 'passed') return;
    passes += 1;
    const previous = results[i - 1];
    if (previous && entry.at - previous.at < QUICK_PASS_MS) quick += 1;
  });
  return { quick, passes };
}

/** Sensibilité un cran en dessous, ou `null` si elle est déjà au plus bas. */
export function lowerSensitivity(current: Sensitivity): Sensitivity | null {
  if (current === 'high') return 'normal';
  if (current === 'normal') return 'low';
  return null;
}

/**
 * Faut-il proposer « La détection est trop sensible ? » ? Seulement avec l'inclinaison (pas en mode
 * tap) et si l'on peut encore baisser la sensibilité.
 */
export function suggestLowerSensitivity(
  results: readonly PlayedCard[],
  options: { tapMode: boolean; sensitivity: Sensitivity },
): boolean {
  if (options.tapMode || lowerSensitivity(options.sensitivity) === null) return false;
  const { quick, passes } = quickPasses(results);
  return quick >= MIN_QUICK_PASSES && quick / passes >= MIN_QUICK_RATIO;
}

/**
 * Téléphone tenu debout au lieu d'à l'horizontale, d'après la gravité (m/s²) : elle tire surtout le
 * long du grand axe Y. Le champ `orientation` de DeviceMotion ne sert pas ici : il suit la rotation
 * de l'écran, verrouillé en paysage pendant la partie. À plat (gravité sur Z), rien n'est signalé.
 */
export function heldUpright(gravity: { x: number; y: number; z: number }): boolean {
  const x = Math.abs(gravity.x);
  const y = Math.abs(gravity.y);
  return y > UPRIGHT_MIN && y > x * UPRIGHT_RATIO;
}

/** Composante minimale le long de Y (≈ 40° depuis l'horizontale) et rapport à X. */
const UPRIGHT_MIN = 6;
const UPRIGHT_RATIO = 1.5;
