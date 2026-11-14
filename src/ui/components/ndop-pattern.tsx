import { useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { NDOP_TILE } from '@/ui/patterns/ndop';

// Tuile pré-rendue par scripts/ndop-tile.mjs avec le chemin de src/ui/patterns/ndop.ts :
// période du motif, 2 × 6 cellules.
const TILE = require('@/assets/patterns/ndop-tile.png') as number;
const TILE_WIDTH = NDOP_TILE * 2;
const TILE_HEIGHT = NDOP_TILE * 6;

type Props = {
  color: string;
  /** Opacité du filigrane (tokens `patternOpacity`, 4–8 %). */
  opacity: number;
};

/**
 * Motif en filigrane qui remplit son parent. Des copies d'une même image blanche, teintée et
 * posée en mosaïque : aucun canvas par carte (une grille de 40 cartes Skia saccadait), rendu
 * identique au motif Skia. `resizeMode="repeat"` ne répète pas en largeur sur Android, d'où la
 * mosaïque posée à la main.
 */
export function NdopPattern({ color, opacity }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const cols = Math.ceil(size.width / TILE_WIDTH);
  const rows = Math.ceil(size.height / TILE_HEIGHT);
  const tiles: { key: string; left: number; top: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({ key: `${row}-${col}`, left: col * TILE_WIDTH, top: row * TILE_HEIGHT });
    }
  }

  return (
    <View
      style={[styles.fill, { opacity }]}
      pointerEvents="none"
      onLayout={onLayout}
      importantForAccessibility="no-hide-descendants"
    >
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={TILE}
          style={[styles.tile, { left: tile.left, top: tile.top, tintColor: color }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  tile: { position: 'absolute', width: TILE_WIDTH, height: TILE_HEIGHT },
});
