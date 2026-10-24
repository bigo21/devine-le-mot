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
 * `visual` (optionnel) lance l'animation correspondante juste avant le son et l'haptique.
 */
export function useFeedback() {
  const sound = useSettings((s) => s.sound);
  const haptics = useSettings((s) => s.haptics);
  const volume = useSettings((s) => s.volume);

  return useCallback(
    (event: FeedbackEvent, visual?: () => void) => {
      visual?.();
      const recipe = recipes[event];
      if (sound && recipe.sound) playSound(recipe.sound, volume);
      if (haptics && recipe.haptic) triggerHaptic(recipe.haptic);
    },
    [sound, haptics, volume],
  );
}
