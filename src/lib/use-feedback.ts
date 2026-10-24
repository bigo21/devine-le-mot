import { useCallback } from 'react';

import { useSettings } from '@/features/settings/store';

import { type HapticKind, triggerHaptic } from './haptics';
import { playSound, type SoundName } from './sounds';

/** Moments de retour de l'app (DESIGN.md §5, MOTION.md §3). */
export type FeedbackEvent =
  | 'tap'
  | 'select'
  | 'snap'
  | 'countdown'
  | 'start'
  | 'found'
  | 'pass'
  | 'tick'
  | 'end'
  | 'record'
  | 'error';

const recipes: Record<FeedbackEvent, { haptic?: HapticKind; sound?: SoundName }> = {
  tap: { haptic: 'tap' },
  select: { haptic: 'select' },
  snap: { haptic: 'light' },
  countdown: { haptic: 'light', sound: 'tick' },
  start: { haptic: 'medium', sound: 'start' },
  found: { haptic: 'success', sound: 'found' },
  pass: { haptic: 'warning', sound: 'pass' },
  tick: { haptic: 'light', sound: 'tick' },
  end: { haptic: 'heavy', sound: 'end' },
  record: { haptic: 'success', sound: 'record' },
  error: { haptic: 'error' },
};

/**
 * Déclenche image, son et vibration sur la même frame (MOTION.md §1.4).
 * `visual` (optionnel) lance l'animation ou l'action correspondante juste après le son et
 * l'haptique : une action qui déclenche à son tour un retour (ex. bouton « Trouvé ») le joue
 * en dernier, donc c'est lui qui reste. Dans l'ordre inverse, le tap du bouton annulait la
 * vibration de jeu au bout de quelques millisecondes.
 */
export function useFeedback() {
  const sound = useSettings((s) => s.sound);
  const haptics = useSettings((s) => s.haptics);
  const volume = useSettings((s) => s.volume);

  return useCallback(
    (event: FeedbackEvent, visual?: () => void) => {
      const recipe = recipes[event];
      if (sound && recipe.sound) playSound(recipe.sound, volume);
      if (haptics && recipe.haptic) triggerHaptic(recipe.haptic);
      visual?.();
    },
    [sound, haptics, volume],
  );
}
