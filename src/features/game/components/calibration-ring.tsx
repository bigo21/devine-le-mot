import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { type ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { easing, timing } from '@/ui/motion';
import { colors } from '@/ui/tokens';

const STROKE = 8;

type Props = {
  /** Avancement de la calibration, de 0 à 1. */
  progress: number;
  size: number;
  children?: ReactNode;
};

/**
 * Jauge circulaire de stabilisation (DESIGN.md §4, MOTION.md §3) : se remplit pendant que le
 * téléphone est stable, redescend doucement s'il bouge (pas de remise à zéro brutale).
 */
export function CalibrationRing({ progress, size, children }: Props) {
  const value = useSharedValue(0);

  useEffect(() => {
    const falling = progress < value.get();
    value.set(withTiming(progress, falling ? { duration: 300, easing: easing.out } : timing.fast));
  }, [progress, value]);

  const arc = useMemo(() => {
    const r = size / 2 - STROKE;
    return Skia.PathBuilder.Make()
      .addArc({ x: STROKE, y: STROKE, width: r * 2, height: r * 2 }, -90, 360)
      .detach();
  }, [size]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - STROKE}
          style="stroke"
          strokeWidth={STROKE}
          color={colors.bgElevated}
        />
        <Path
          path={arc}
          start={0}
          end={value}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          color={colors.palm}
        />
      </Canvas>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
