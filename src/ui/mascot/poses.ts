// Poses de la mascotte géométrique (docs/ASSETS.md §2, option A ; états de docs/MOTION.md §3).
// Valeurs pures, sans Reanimated : testables.

export const mascotStates = ['rest', 'wave', 'attention', 'celebrate', 'pout', 'think'] as const;
export type MascotState = (typeof mascotStates)[number];

export type Pose = {
  /** Ouverture des yeux (1 = normale, < 1 plissés, > 1 grands ouverts). */
  eyeOpen: number;
  /** Direction du regard, en unités du dessin (100 × 100). */
  lookX: number;
  lookY: number;
  /** Courbure de la bouche : 1 sourire, 0 neutre, −1 bouche tombante. */
  mouthCurve: number;
  /** Ouverture de la bouche (0 fermée, 1 grande ouverte). */
  mouthOpen: number;
  /** Décalage horizontal de la bouche (air songeur). */
  mouthShift: number;
  /** Inclinaison du corps, en degrés. */
  tilt: number;
  /** Échelle de base du corps. */
  scale: number;
};

export const poses: Record<MascotState, Pose> = {
  rest: {
    eyeOpen: 1,
    lookX: 0,
    lookY: 0,
    mouthCurve: 0.45,
    mouthOpen: 0,
    mouthShift: 0,
    tilt: 0,
    scale: 1,
  },
  wave: {
    eyeOpen: 1,
    lookX: 0,
    lookY: 0,
    mouthCurve: 1,
    mouthOpen: 0.25,
    mouthShift: 0,
    tilt: 0,
    scale: 1,
  },
  attention: {
    eyeOpen: 1.25,
    lookX: 0,
    lookY: -1,
    mouthCurve: 0,
    mouthOpen: 0.55,
    mouthShift: 0,
    tilt: 0,
    scale: 1.05,
  },
  celebrate: {
    eyeOpen: 0.55,
    lookX: 0,
    lookY: 0,
    mouthCurve: 1,
    mouthOpen: 0.7,
    mouthShift: 0,
    tilt: 0,
    scale: 1.04,
  },
  pout: {
    eyeOpen: 0.9,
    lookX: 0,
    lookY: 3,
    mouthCurve: -0.7,
    mouthOpen: 0,
    mouthShift: 0,
    tilt: -6,
    scale: 0.98,
  },
  think: {
    eyeOpen: 1,
    lookX: 4,
    lookY: -4,
    mouthCurve: -0.05,
    mouthOpen: 0,
    mouthShift: 4,
    tilt: 3,
    scale: 1,
  },
};

/** Géométrie de la bouche (ellipse en forme de lentille entre deux courbes). */
export function mouthControls(pose: Pick<Pose, 'mouthCurve' | 'mouthOpen'>, baseY = 60) {
  'worklet';
  const top = baseY + pose.mouthCurve * 7 - pose.mouthOpen * 5;
  const bottom = baseY + pose.mouthCurve * 7 + pose.mouthOpen * 9;
  return { top, bottom };
}

/** Délai avant le prochain clignement au repos : entre 3 et 6 s (MOTION.md §3). */
export function nextBlinkDelay(random: number): number {
  return 3000 + Math.min(1, Math.max(0, random)) * 3000;
}
