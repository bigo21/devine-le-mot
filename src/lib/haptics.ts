import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Correspondances de docs/DESIGN.md §5 : light (taps), success (trouvé), warning (passer), heavy (fin).
// Sur Android, les retours d'interface passent par le moteur haptique du système (discret, respecte
// le réglage « vibration au toucher ») ; les retours de jeu passent par le vibreur, assez fort pour
// être senti avec le téléphone sur le front.
export type HapticKind =
  'tap' | 'select' | 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy';

const isAndroid = Platform.OS === 'android';

export function triggerHaptic(kind: HapticKind): void {
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
