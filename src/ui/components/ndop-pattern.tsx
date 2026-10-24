import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ndopPath } from '@/ui/patterns/ndop';

type Props = {
  color: string;
  /** Opacité du filigrane (tokens `patternOpacity`, 4–8 %). */
  opacity: number;
};

/** Motif en filigrane qui remplit son parent. Statique : dessiné une fois, jamais animé. */
export function NdopPattern({ color, opacity }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const path = useMemo(
    () => (size.width > 0 ? Skia.Path.MakeFromSVGString(ndopPath(size.width, size.height)) : null),
    [size.width, size.height],
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={onLayout}
      importantForAccessibility="no-hide-descendants"
    >
      {path ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Path
            path={path}
            color={color}
            opacity={opacity}
            style="stroke"
            strokeWidth={1.5}
            strokeJoin="round"
          />
        </Canvas>
      ) : null}
    </View>
  );
}
