import { Canvas, Picture, Skia, type SkColor } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion, useReducedMotion } from '@/ui/motion';
import { colors } from '@/ui/tokens';

/** Couleurs de fête des tokens (DESIGN.md §2). */
const PALETTE = [
  colors.mango,
  colors.sun,
  colors.palm,
  colors.hibiscus,
  colors.lagoon,
  colors.orchid,
];

type Particle = {
  x: number;
  delay: number;
  fall: number;
  sway: number;
  phase: number;
  spin: number;
  w: number;
  h: number;
  color: SkColor;
};

type Props = {
  /** Lance une nouvelle pluie à chaque changement de valeur (vrai = visible). */
  fire: boolean;
};

/**
 * Pluie de confettis Skia (MOTION.md §3) : une seule image dessinée par frame sur le fil UI, pas de
 * vue par particule. Ne bloque aucun toucher. Absente en mode réduit.
 */
export function Confetti({ fire }: Props) {
  const reduced = useReducedMotion();
  // Taille lue dans le worklet Skia : une valeur partagée, pas un état React.
  const size = useSharedValue({ width: 0, height: 0 });
  const t = useSharedValue(0);

  // Tirées une fois : positions, vitesses et couleurs (le hasard ne change pas à chaque rendu).
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: motion.confettiCount }, (_, i) => ({
      x: Math.random(),
      delay: Math.random() * 0.25,
      fall: 0.7 + Math.random() * 0.5,
      sway: 10 + Math.random() * 24,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 900,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: Skia.Color(PALETTE[i % PALETTE.length]!),
    })),
  );

  useEffect(() => {
    if (!fire || reduced) return;
    t.set(0);
    t.set(withTiming(1, { duration: motion.confettiDuration, easing: Easing.linear }));
  }, [fire, reduced, t]);

  const picture = useDerivedValue(() => {
    const { width, height } = size.get();
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
    const progress = t.get();
    if (progress > 0 && progress < 1 && width > 0) {
      const paint = Skia.Paint();
      for (const p of particles) {
        const local = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
        if (local <= 0) continue;
        // Chute accélérée depuis le haut, léger balancement, fondu sur la fin.
        const y = -20 + local * local * p.fall * (height + 40);
        const x = p.x * width + Math.sin(p.phase + local * 6) * p.sway;
        paint.setColor(p.color);
        paint.setAlphaf(local > 0.8 ? (1 - local) / 0.2 : 1);
        canvas.save();
        canvas.translate(x, y);
        canvas.rotate(p.spin * local, 0, 0);
        canvas.drawRect(Skia.XYWHRect(-p.w / 2, -p.h / 2, p.w, p.h), paint);
        canvas.restore();
      }
    }
    return recorder.finishRecordingAsPicture();
  });

  if (reduced) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    size.set({ width, height });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
