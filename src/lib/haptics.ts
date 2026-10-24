import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

// Correspondances de docs/DESIGN.md §5 : light (taps), success (trouvé), warning (passer), heavy (fin).
// Sur Android :
// - les retours d'interface passent par le moteur haptique du système (discret, respecte le réglage
//   « vibration au toucher ») ;
// - les retours de jeu jouent des rythmes distincts sur le vibreur, à l'intensité par défaut de
//   l'appareil. Les motifs d'expo-haptics y sont trop faibles (≈ 20 % de l'amplitude) et presque
//   identiques entre « trouvé » et « passer » : indiscernables téléphone sur le front.
export type HapticKind =
  'tap' | 'select' | 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy';

type GameHaptic = Exclude<HapticKind, 'tap' | 'select'>;

/**
 * Rythmes Android (ms) au format de `Vibration.vibrate` : [attente, vibration, attente, vibration…].
 * Chaque retour se reconnaît au rythme, pas à la force.
 */
export const androidPatterns: Record<GameHaptic, number[]> = {
  /** Trouvé : « ta-tam », deux impulsions rapprochées, la seconde plus longue. */
  success: [0, 45, 70, 110],
  /** Passer : un seul « bzz » plat et long. */
  warning: [0, 220],
  /** Erreur : trois coups secs. */
  error: [0, 40, 60, 40, 60, 40],
  /** Tic (compte à rebours, 10 dernières secondes) : très bref. */
  light: [0, 25],
  /** C'est parti : bref et franc. */
  medium: [0, 70],
  /** Fin de manche : longue vibration. */
  heavy: [0, 600],
};

const isAndroid = Platform.OS === 'android';

const isGameHaptic = (kind: HapticKind): kind is GameHaptic => kind !== 'tap' && kind !== 'select';

/**
 * Parmi les retours demandés pendant un même geste, garde celui à jouer : le dernier retour de
 * jeu s'il y en a un, sinon le dernier retour d'interface.
 */
export function pickHaptic(requested: readonly HapticKind[]): HapticKind | undefined {
  const game = requested.filter(isGameHaptic);
  return game.at(-1) ?? requested.at(-1);
}

let pending: HapticKind[] = [];

/**
 * Un tap de bouton qui déclenche « Trouvé » demande deux retours dans le même geste. Joués tous
 * les deux, le second annule le premier sur Android (et l'ordre d'arrivée n'est pas garanti entre
 * modules natifs). On les regroupe donc jusqu'à la fin de la tâche en cours et on n'en joue qu'un.
 */
export function triggerHaptic(kind: HapticKind): void {
  pending.push(kind);
  if (pending.length > 1) return;
  queueMicrotask(() => {
    const chosen = pickHaptic(pending);
    pending = [];
    if (chosen) play(chosen);
  });
}

function play(kind: HapticKind): void {
  if (isAndroid && isGameHaptic(kind)) {
    Vibration.vibrate(androidPatterns[kind]);
    return;
  }
  void run(kind).catch(() => undefined);
}

function run(kind: HapticKind): Promise<void> {
  switch (kind) {
    case 'tap':
      return isAndroid
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'select':
      return isAndroid
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
        : Haptics.selectionAsync();
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'warning':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'heavy':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}
