import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';

export type FpsReport = { average: number; worst: number };

/**
 * Mesure des fps dans la boucle de rendu (Phase 4.1) : moyenne et pire image sur chaque seconde.
 * Une seule mise à jour React par seconde, rien à chaque image.
 */
export function FpsMeter({ onReport }: { onReport: (report: FpsReport) => void }) {
  const acc = useRef({ frames: 0, time: 0, worst: 0 });
  useFrame((_, delta) => {
    const a = acc.current;
    a.frames += 1;
    a.time += delta;
    a.worst = Math.max(a.worst, delta);
    if (a.time >= 1) {
      onReport({ average: a.frames / a.time, worst: a.worst > 0 ? 1 / a.worst : 0 });
      acc.current = { frames: 0, time: 0, worst: 0 };
    }
  });
  return null;
}
