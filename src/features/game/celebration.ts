// Réaction de l'écran des résultats (DESIGN.md §4, MOTION.md §3) : logique pure, testable.

export type Mood = 'celebrate' | 'neutral' | 'pout';

/**
 * Humeur selon le rythme de la manche, en mots trouvés par minute : à partir de 6 (un mot toutes
 * les 10 s), c'est un bon score ; sous 2, la mascotte fait la moue (toujours bienveillante). Un
 * record se fête toujours.
 */
export function moodFor(score: number, durationS: number, record: boolean): Mood {
  if (record) return 'celebrate';
  const perMinute = durationS > 0 ? (score * 60) / durationS : 0;
  if (score >= 3 && perMinute >= 6) return 'celebrate';
  if (perMinute < 2) return 'pout';
  return 'neutral';
}

/** Record battu : il faut un précédent score avec les mêmes réglages (pas à la toute première). */
export function isRecord(score: number, previousBest: number | null): boolean {
  return previousBest !== null && score > previousBest;
}
