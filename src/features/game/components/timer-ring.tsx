import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

import { colors } from '@/ui/tokens';

const INSET = 6;
const WIDTH = 5;

type Props = {
  /** Temps restant, de 1 (plein) à 0 (vide), animé sur le thread UI. */
  progress: SharedValue<number>;
  /** 10 dernières secondes : anneau rouge. */
  danger: boolean;
  /** Pulsation des 10 dernières secondes (0 à 1). */
  pulse: SharedValue<number>;
  /** Couleur du texte sur le fond de la catégorie (`on<Couleur>`). */
  foreground: string;
};

/**
 * Anneau fin qui suit le bord de l'écran et se vide (DESIGN.md §4). Le liseré `foreground`
 * sous le rouge garde l'anneau lisible sur toutes les couleurs de catégorie.
 */
export function TimerRing({ progress, danger, pulse, foreground }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const path = useMemo(() => {
    if (size.width === 0) return null;
    const rect = {
      x: INSET,
      y: INSET,
      width: size.width - INSET * 2,
      height: size.height - INSET * 2,
    };
    const radius = 28;
    return Skia.PathBuilder.Make().addRRect({ rect, rx: radius, ry: radius }).detach();
  }, [size.width, size.height]);

  const end = useDerivedValue(() => Math.max(0, Math.min(1, progress.get())));
  const dangerOpacity = useDerivedValue(() => 0.75 + pulse.get() * 0.25);
  const dangerWidth = useDerivedValue(() => WIDTH + pulse.get() * 3);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={onLayout}
      importantForAccessibility="no-hide-descendants"
    >
      {path ? (
        <Canvas style={StyleSheet.absoluteFill}>
          {danger ? (
            <>
              <Path
                path={path}
                start={0}
                end={end}
                style="stroke"
                strokeWidth={WIDTH + 4}
                strokeCap="round"
                color={foreground}
              />
              <Path
                path={path}
                start={0}
                end={end}
                style="stroke"
                strokeWidth={dangerWidth}
                strokeCap="round"
                color={colors.danger}
                opacity={dangerOpacity}
              />
            </>
          ) : (
            <Path
              path={path}
              start={0}
              end={end}
              style="stroke"
              strokeWidth={WIDTH}
              strokeCap="round"
              color={foreground}
              opacity={0.55}
            />
          )}
        </Canvas>
      ) : null}
    </View>
  );
}
