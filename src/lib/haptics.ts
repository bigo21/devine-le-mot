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
 * Chaque retour se reconnaît au rythme, pas à la force. Seuils de perception : impulsions d'au
 * moins 60 ms (en dessous, on sent à peine quelque chose) et pauses d'au moins 80 ms (sinon deux
 * impulsions se fondent en une). Une vibration continue s'émousse vite : pour « long », on répète.
 */
export const androidPatterns: Record<GameHaptic, number[]> = {
  /** Trouvé : « ta-tam », deux impulsions, la seconde plus longue. */
  success: [0, 100, 90, 180],
  /** Passer : un seul « bzz » plat. */
  warning: [0, 350],
  /** Erreur : trois coups. */
  error: [0, 90, 80, 90, 80, 90],
  /** Tic (compte à rebours, 10 dernières secondes) : bref. */
  light: [0, 60],
  /** C'est parti : franc. */
  medium: [0, 160],
  /** Fin de manche : deux longues impulsions. */
  heavy: [0, 450, 150, 650],
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
