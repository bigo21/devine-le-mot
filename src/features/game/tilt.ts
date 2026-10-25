// Détection d'inclinaison (docs/GAMEPLAY.md §2) : logique pure, testable sans capteur.
// Le hook useTilt branche DeviceMotion dessus ; ici, uniquement des mesures → événements.

import type { Sensitivity } from '@/features/settings/store';

/** Vecteur de gravité mesuré (m/s²), axes de l'appareil en portrait (X droite, Y haut, Z vers l'avant). */
export type Gravity = { x: number; y: number; z: number };

/** Orientation de l'écran fournie par DeviceMotion : 0, 90, -90 ou 180. */
export type ScreenOrientation = 0 | 90 | -90 | 180;

/**
 * Signe de Z quand l'écran regarde le sol. Constaté sur appareil (Redmi, Android 15, 25/10/2026) :
 * DeviceMotion renvoie la gravité elle-même, donc z ≈ +9,8 écran vers le sol (et −9,8 écran vers
 * le plafond). La valeur −1 inversait trouvé et passer.
 */
export const SCREEN_DOWN_SIGN = 1;

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Angle de l'écran par rapport à la verticale, en degrés : 0 = écran vertical (téléphone sur le
 * front), positif = écran qui se tourne vers le sol, négatif = vers le plafond.
 * `upSign` oriente l'axe « haut de l'écran » (fixé à la calibration, voir `upSignFor`).
 */
export function screenPitch(
  gravity: Gravity,
  orientation: ScreenOrientation,
  upSign: 1 | -1,
): number {
  const up = (orientation === 90 || orientation === -90 ? gravity.x : gravity.y) * upSign;
  return Math.atan2(gravity.z * SCREEN_DOWN_SIGN, up) * RAD_TO_DEG;
}

/** Sens de l'axe « haut de l'écran » pour la tenue actuelle (paysage gauche ou droit). */
export function upSignFor(gravity: Gravity, orientation: ScreenOrientation): 1 | -1 {
  const up = orientation === 90 || orientation === -90 ? gravity.x : gravity.y;
  return up >= 0 ? 1 : -1;
}

export type TiltConfig = {
  /** Écart à la référence qui déclenche un geste (°). */
  trigger: number;
  /** Écart sous lequel le geste suivant est réarmé (°) : hystérésis. */
  rearm: number;
  /** Délai minimal entre deux gestes (ms). */
  debounceMs: number;
  /** Nombre de mesures moyennées (lissage). */
  smoothing: number;
  /** Durée de stabilité exigée pour calibrer (ms). */
  calibrationMs: number;
  /** Variation maximale tolérée pendant la calibration (°). */
  stabilityTolerance: number;
  /** Durée pendant laquelle l'inclinaison doit dépasser le seuil pour compter (ms). */
  triggerHoldMs: number;
  /** Durée de retour à l'équilibre exigée avant le geste suivant (ms). */
  neutralHoldMs: number;
};

const base = {
  debounceMs: 400,
  smoothing: 4,
  calibrationMs: 800,
  stabilityTolerance: 6,
  // Un geste se maintient ; une secousse (rire, hochement) non.
  triggerHoldMs: 100,
  // Après un geste, revenir droit et y rester : le rebond de la tête ne déclenche rien.
  neutralHoldMs: 300,
};

/** Seuils par sensibilité (réglage « Sensibilité de détection »). */
export const tiltConfigs: Record<Sensitivity, TiltConfig> = {
  low: { ...base, trigger: 50, rearm: 25 },
  normal: { ...base, trigger: 40, rearm: 20 },
  high: { ...base, trigger: 30, rearm: 15 },
};

export type TiltEvent =
  | { type: 'calibrated'; reference: number }
  | { type: 'correct'; at: number }
  | { type: 'pass'; at: number };

export type TiltState = {
  phase: 'calibrating' | 'armed' | 'waitingNeutral';
  /** Dernières mesures brutes (pour le lissage). */
  recent: number[];
  /** Fenêtre de calibration en cours : mesures lissées et brutes. */
  calibration: { start: number; values: number[]; raw: number[] } | null;
  /** Angle de référence (position neutre), fixé à la calibration. */
  reference: number | null;
  lastTriggerAt: number;
  /** Geste en cours de maintien au-delà du seuil (sens et début), avant validation. */
  pending: { direction: 1 | -1; since: number } | null;
  /** Début du retour à l'équilibre après un geste (réarmement après `neutralHoldMs`). */
  neutralSince: number | null;
  /** Dernier angle lissé (affichage de réglage). */
  smoothed: number | null;
};

export function initialTiltState(): TiltState {
  return {
    phase: 'calibrating',
    recent: [],
    calibration: null,
    reference: null,
    lastTriggerAt: Number.NEGATIVE_INFINITY,
    pending: null,
    neutralSince: null,
    smoothed: null,
  };
}

/** Repart en calibration (nouvelle manche, téléphone repositionné). */
export function recalibrate(state: TiltState): TiltState {
  return { ...initialTiltState(), recent: state.recent };
}

/** Avancement de la calibration, de 0 à 1 (jauge circulaire de l'écran « front »). */
export function calibrationProgress(state: TiltState, now: number, config: TiltConfig): number {
  if (state.phase !== 'calibrating') return 1;
  if (!state.calibration) return 0;
  return Math.min(1, (now - state.calibration.start) / config.calibrationMs);
}

/** Écart toléré sur les mesures brutes, relatif à la tolérance sur les mesures lissées. */
const RAW_SPREAD_FACTOR = 2.5;

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Traite une mesure d'angle (`screenPitch`) prise à l'instant `now` (ms).
 * Renvoie le nouvel état et les événements produits (au plus un par mesure).
 */
export function stepTilt(
  state: TiltState,
  angle: number,
  now: number,
  config: TiltConfig,
): { state: TiltState; events: TiltEvent[] } {
  const recent = [...state.recent, angle].slice(-config.smoothing);
  const smoothed = mean(recent);
  const next: TiltState = { ...state, recent, smoothed };

  if (state.phase === 'calibrating') {
    const window = state.calibration;
    const values = window ? [...window.values, smoothed] : [smoothed];
    const raw = window ? [...window.raw, angle] : [angle];
    const spread = (list: number[]) => Math.max(...list) - Math.min(...list);
    // Stable : la moyenne lissée bouge peu, et les mesures brutes aussi (le lissage seul masquerait
    // une oscillation rapide de grande amplitude).
    const stable =
      spread(values) <= config.stabilityTolerance &&
      spread(raw) <= config.stabilityTolerance * RAW_SPREAD_FACTOR;
    if (!window || !stable) {
      // Le téléphone bouge : on recommence la fenêtre à partir de cette mesure.
      return {
        state: { ...next, calibration: { start: now, values: [smoothed], raw: [angle] } },
        events: [],
      };
    }
    if (now - window.start >= config.calibrationMs) {
      const reference = mean(values);
      return {
        state: { ...next, phase: 'armed', calibration: null, reference },
        events: [{ type: 'calibrated', reference }],
      };
    }
    return { state: { ...next, calibration: { start: window.start, values, raw } }, events: [] };
  }

  const delta = smoothed - (state.reference ?? 0);

  if (state.phase === 'waitingNeutral') {
    // Réarmement seulement après un vrai retour à l'équilibre, tenu `neutralHoldMs`.
    if (Math.abs(delta) > config.rearm) {
      return { state: { ...next, neutralSince: null }, events: [] };
    }
    const since = state.neutralSince ?? now;
    const rearmed = now - since >= config.neutralHoldMs;
    return {
      state: rearmed
        ? { ...next, phase: 'armed', neutralSince: null, pending: null }
        : { ...next, neutralSince: since },
      events: [],
    };
  }

  if (Math.abs(delta) < config.trigger) {
    return { state: { ...next, pending: null }, events: [] };
  }

  // Écran vers le sol = trouvé ; vers le plafond = passer (GAMEPLAY.md §1).
  const direction: 1 | -1 = delta > 0 ? 1 : -1;
  const pending =
    state.pending?.direction === direction ? state.pending : { direction, since: now };
  const held = now - pending.since >= config.triggerHoldMs;
  if (!held || now - state.lastTriggerAt < config.debounceMs) {
    return { state: { ...next, pending }, events: [] };
  }

  const type = direction > 0 ? 'correct' : 'pass';
  return {
    state: {
      ...next,
      phase: 'waitingNeutral',
      lastTriggerAt: now,
      pending: null,
      neutralSince: null,
    },
    events: [{ type, at: now }],
  };
}
