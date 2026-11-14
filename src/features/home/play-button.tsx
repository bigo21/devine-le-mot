import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useFeedback } from '@/lib/use-feedback';
import { Icon, Text } from '@/ui/components';
import { easing, motion, useBreathe, usePress, useReducedMotion } from '@/ui/motion';
import { colors, onColor, radii, shadows, spacing } from '@/ui/tokens';

const HEIGHT = 112;

type Props = {
  label: string;
  onPress: () => void;
  /** La respiration ne démarre qu'après l'entrée en scène (MOTION.md §3). */
  breathing: boolean;
};

/**
 * Bouton « Jouer » de l'accueil (DESIGN.md §4) : dégradé Skia mango → soleil qui dérive
 * lentement, et respiration (`breathe`). Mode réduit : dégradé fixe, pas de respiration.
 */
export function PlayButton({ label, onPress, breathing }: Props) {
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const press = usePress(reduced);
  const breathe = useBreathe(breathing, reduced);
  const [width, setWidth] = useState(0);

  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(drift);
      drift.set(0);
      return;
    }
    drift.set(
      withRepeat(
        withTiming(1, { duration: motion.playGradientLoop, easing: easing.breathe }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(drift);
  }, [drift, reduced]);

  // Le dégradé glisse en diagonale : la lumière semble passer lentement sur le bouton.
  const start = useDerivedValue(() => vec(drift.get() * width * 0.4, 0));
  const end = useDerivedValue(() => vec(width * (0.6 + drift.get() * 0.4), HEIGHT));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Animated.View style={breathe}>
      <Pressable
        onPress={() => feedback('tap', onPress)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.View style={[styles.button, press.style]} onLayout={onLayout}>
          {width > 0 ? (
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              <RoundedRect x={0} y={0} width={width} height={HEIGHT} r={radii.lg}>
                <LinearGradient start={start} end={end} colors={[colors.mango, colors.sun]} />
              </RoundedRect>
            </Canvas>
          ) : null}
          <View style={styles.content}>
            <Icon icon={PlayIcon} size={36} color={onColor('mango')} emphasis />
            <Text variant="hero" color={onColor('mango')}>
              {label}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: HEIGHT,
    borderRadius: radii.lg,
    backgroundColor: colors.mango,
    boxShadow: shadows.soft,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
