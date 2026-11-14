// Valeurs pures du mouvement (sans Reanimated) : testables et partagées par les presets.

/** Valeurs du vocabulaire de mouvement (docs/MOTION.md §2). */
export const motion = {
  pressScale: 0.96,
  popFromScale: 0.6,
  riseFromY: 16,
  breatheScale: 1.03,
  breatheDuration: 2400,
  shakeOffset: 8,
  shakeDuration: 300,
  shakeCycles: 3,
  countDuration: 600,
  flashPeak: 0.9,
  /** Flash trouvé/passer : assez long pour être vu du coin de l'œil, en pleine partie (retour terrain). */
  flashDuration: 500,
  /** Flash en mode réduit : simple fondu, sans palier. */
  flashReducedDuration: 300,
  /** Sortie du mot trouvé/passé : le jeu reste vif, le mot suivant arrive ensuite. */
  wordExit: 220,
  /** Décalage entre deux éléments d'une liste en cascade (30–40 ms). */
  stagger: 35,
  /** Au-delà, les éléments d'une liste apparaissent sans animation. */
  maxStaggered: 12,
  /** Liste des mots sur l'écran des résultats (MOTION.md §3) : 25 ms par ligne, 15 lignes animées. */
  resultsStagger: 25,
  resultsMaxStaggered: 15,
  /** Boucle de l'icône animée d'une variante (aller-retour). */
  variantIconLoop: 700,
  /** Consigne d'une variante jouée pour la première fois, avant le compte à rebours (UX.md §4) :
   * 5 s, le temps que tout le groupe la lise (retour terrain du 25/10/2026). */
  variantIntro: 5000,
  /** Dérive du dégradé du bouton Jouer (aller-retour), plus lente que la respiration. */
  playGradientLoop: 4800,
  /** Boucle de l'écran du front : le téléphone monte, se pose (et montre les gestes la 1re fois). */
  foreheadLoop: 2600,
  /** Confettis des résultats (MOTION.md §3) : 1,5 s, 80 particules au plus. */
  confettiDuration: 1500,
  confettiCount: 70,
  foreheadLoopWithGestures: 5200,
  /** Mix : chrono arrêté à chaque nouveau mot, le temps de lire sa consigne (retour terrain). */
  mixReading: 3000,
} as const;

/** Délai d'un élément de liste en cascade ; `undefined` au-delà du plafond (apparition directe). */
export function staggerDelay(index: number, baseDelay = 0): number | undefined {
  if (index >= motion.maxStaggered) return undefined;
  return baseDelay + index * motion.stagger;
}
