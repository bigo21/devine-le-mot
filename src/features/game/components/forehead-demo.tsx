import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Mascot } from '@/ui/mascot';
import { motion, useReducedMotion } from '@/ui/motion';
import { colors, radii } from '@/ui/tokens';

type Props = {
  size: number;
  /** Première fois : le téléphone montre aussi les deux gestes (bas = trouvé, haut = passer). */
  showGestures: boolean;
};

/**
 * Animation de l'écran du front (DESIGN.md §4, ASSETS.md §1 : fausse 3D en Reanimated) : la
 * mascotte fait la tête, un téléphone monte se poser sur son front. Décorative : les consignes
 * sont écrites à côté. Mode réduit : téléphone déjà posé, immobile.
 */
export function ForeheadDemo({ size, showGestures }: Props) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(reduced ? 0.3 : 0);
  const duration = showGestures ? motion.foreheadLoopWithGestures : motion.foreheadLoop;

  useEffect(() => {
    if (reduced) {
      cancelAnimation(clock);
      clock.set(0.3);
      return;
    }
    clock.set(0);
    clock.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [clock, duration, reduced]);

  const phoneWidth = size * 0.5;
  const rest = -size * 0.2; // hauteur du front
  const start = size * 0.55; // départ, en bas (dans la main)

  const phoneStyle = useAnimatedStyle(() => {
    const t = clock.get();
    // Montée (0 → 0,2), pose, puis gestes éventuels, et disparition en fin de boucle.
    const rise = interpolate(t, [0, 0.2], [0, 1], 'clamp');
    const eased = 1 - (1 - rise) ** 3;
    const fade = interpolate(t, [0, 0.06, 0.92, 1], [0, 1, 1, 0], 'clamp');
    const tilt = showGestures
      ? interpolate(t, [0.3, 0.42, 0.52, 0.6, 0.72, 0.82], [0, 40, 40, 0, -40, 0], 'clamp')
      : 0;
    return {
      opacity: reduced ? 1 : fade,
      backgroundColor: showGestures
        ? interpolateColor(
            t,
            [0.36, 0.42, 0.52, 0.58, 0.66, 0.72, 0.8, 0.86],
            [
              colors.lagoon,
              colors.palm,
              colors.palm,
              colors.lagoon,
              colors.lagoon,
              colors.pass,
              colors.pass,
              colors.lagoon,
            ],
          )
        : colors.lagoon,
      transform: [
        { perspective: 400 },
        { translateY: reduced ? rest : start + (rest - start) * eased },
        { rotateX: `${tilt}deg` },
      ],
    };
  });

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Mascot state="attention" size={size * 0.75} />
      <Animated.View
        style={[
          styles.phone,
          { width: phoneWidth, height: phoneWidth * 0.5, borderRadius: phoneWidth * 0.1 },
          phoneStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  phone: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.bgElevated,
    borderRadius: radii.sm,
  },
});
