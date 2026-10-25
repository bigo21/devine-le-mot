// Vocabulaire de mouvement de docs/MOTION.md §2 : press, pop, rise, breathe, shake, count, flash.
// Tout tourne sur le thread UI (shared values + worklets) ; chaque mouvement a sa version réduite.
import { useCallback, useEffect } from 'react';
import {
  cancelAnimation,
  type EntryExitAnimationFunction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easing, motion, spring, timing } from './presets';

export { staggerDelay } from './constants';

type EnterOptions = { delay?: number; reduced?: boolean };

const fadeIn =
  (delay: number): EntryExitAnimationFunction =>
  () => {
    'worklet';
    return {
      initialValues: { opacity: 0 },
      animations: { opacity: withDelay(delay, withTiming(1, timing.fast)) },
    };
  };

/** `pop` : scale 0,6 → 1 + opacité, ressort bouncy (badge, chiffre, icône). */
export function pop({ delay = 0, reduced = false }: EnterOptions = {}): EntryExitAnimationFunction {
  if (reduced) return fadeIn(delay);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: motion.popFromScale }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, timing.fast)),
        transform: [{ scale: withDelay(delay, withSpring(1, spring.bouncy)) }],
      },
    };
  };
}

/** `rise` : translateY +16 → 0 + opacité, ressort gentle (cartes, lignes en cascade). */
export function rise({
  delay = 0,
  reduced = false,
}: EnterOptions = {}): EntryExitAnimationFunction {
  if (reduced) return fadeIn(delay);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: motion.riseFromY }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, timing.base)),
        transform: [{ translateY: withDelay(delay, withSpring(0, spring.gentle)) }],
      },
    };
  };
}

/** Sortie discrète (cartes qui quittent un filtre). */
export const fadeOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1 },
    animations: { opacity: withTiming(0, timing.fast) },
  };
};

/** `press` : scale 1 → 0,96 en ressort snappy, retour au relâchement. */
export function usePress(reduced: boolean) {
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    const p = pressed.get();
    // Toujours les deux propriétés : basculer de mode ne doit pas laisser un reste de l'autre.
    if (reduced) return { opacity: 1 - p * 0.2, transform: [{ scale: 1 }] };
    return { opacity: 1, transform: [{ scale: 1 - p * (1 - motion.pressScale) }] };
  });

  const onPressIn = useCallback(() => {
    pressed.set(withSpring(1, spring.snappy));
  }, [pressed]);

  const onPressOut = useCallback(() => {
    pressed.set(withSpring(0, spring.snappy));
  }, [pressed]);

  return { style, onPressIn, onPressOut };
}

/** `breathe` : scale 1 ↔ 1,03 en boucle (bouton Jouer, mascotte au repos). Coupé en mode réduit. */
export function useBreathe(active: boolean, reduced: boolean) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(scale);
      scale.set(withTiming(1, timing.fast));
      return;
    }
    scale.set(
      withRepeat(
        withTiming(motion.breatheScale, {
          duration: motion.breatheDuration / 2,
          easing: easing.breathe,
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(scale);
  }, [active, reduced, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

/** `shake` : translateX ±8 × 3 en 300 ms (erreur). En mode réduit : bref clignement. */
export function useShake(reduced: boolean) {
  const offset = useSharedValue(0);
  const dim = useSharedValue(1);

  const shake = useCallback(() => {
    if (reduced) {
      dim.set(
        withSequence(
          withTiming(0.4, { duration: timing.fast.duration / 2 }),
          withTiming(1, { duration: timing.fast.duration / 2 }),
        ),
      );
      return;
    }
    const step = motion.shakeDuration / (motion.shakeCycles * 2 + 1);
    const swings = Array.from({ length: motion.shakeCycles * 2 }, (_, i) =>
      withTiming(i % 2 === 0 ? motion.shakeOffset : -motion.shakeOffset, { duration: step }),
    );
    offset.set(withSequence(...swings, withTiming(0, { duration: step })));
  }, [dim, offset, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: dim.get(),
    transform: [{ translateX: offset.get() }],
  }));

  return { style, shake };
}

/** `flash` : calque plein écran 0 → 0,9 → 0 en 500 ms : montée rapide, palier, fondu (trouvé / passer). */
export function useFlash(reduced: boolean) {
  const opacity = useSharedValue(0);
  const color = useSharedValue('transparent');

  const flash = useCallback(
    (nextColor: string) => {
      color.set(nextColor);
      if (reduced) {
        const half = motion.flashReducedDuration / 2;
        opacity.set(
          withSequence(
            withTiming(motion.flashPeak, { duration: half }),
            withTiming(0, { duration: half }),
          ),
        );
        return;
      }
      const total = motion.flashDuration;
      opacity.set(
        withSequence(
          withTiming(motion.flashPeak, { duration: total * 0.15, easing: easing.out }),
          withDelay(total * 0.3, withTiming(0, { duration: total * 0.55, easing: easing.out })),
        ),
      );
    },
    [color, opacity, reduced],
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    backgroundColor: color.get(),
  }));

  // `opacity` : pour synchroniser un élément avec le flash (il apparaît et disparaît avec lui).
  return { style, flash, opacity };
}
