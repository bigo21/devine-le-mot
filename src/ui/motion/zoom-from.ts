// Transition « carte → écran détail » (MOTION.md §3, choix de catégorie) : zoom + fondu croisé.
// Les transitions d'éléments partagés de Reanimated 4.7 restent expérimentales (option native
// désactivée) : on reproduit l'effet en faisant partir l'élément d'arrivée du rectangle touché.
import { type ComponentRef, useCallback, useRef } from 'react';
import type { View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { spring } from './presets';

/** Rectangle de départ, en coordonnées de la fenêtre. */
export type ZoomOrigin = { x: number; y: number; width: number; height: number };

/** Une origine trop ancienne ne sert plus (retour arrière, autre chemin vers l'écran). */
const MAX_AGE_MS = 1000;
/** Opacité de départ : l'élément se révèle en grandissant (fondu croisé avec l'écran quitté). */
const FROM_OPACITY = 0.4;

let pending: { key: string; origin: ZoomOrigin; at: number } | null = null;

/** Mémorise le rectangle touché, juste avant de naviguer. */
export function setZoomOrigin(key: string, origin: ZoomOrigin): void {
  pending = { key, origin, at: Date.now() };
}

/** Récupère (une seule fois) le rectangle de départ de l'élément `key`. */
export function takeZoomOrigin(key: string): ZoomOrigin | null {
  const found = pending;
  pending = null;
  if (!found || found.key !== key || Date.now() - found.at > MAX_AGE_MS) return null;
  return found.origin;
}

/**
 * Zoom de l'élément d'arrivée depuis `origin` (centre aligné, échelle uniforme sur la largeur),
 * en ressort gentle. Il part une fois la place d'arrivée mesurée (l'écran natif est alors posé).
 * Sans origine ou en mouvement réduit, l'élément est affiché tel quel.
 */
export function useZoomFrom(origin: ZoomOrigin | null, reduced: boolean) {
  const active = origin !== null && !reduced;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const progress = useSharedValue(active ? 0 : 1);
  // Invisible tant que la place d'arrivée n'est pas mesurée (pas d'éclair à pleine taille).
  const from = useSharedValue({ dx: 0, dy: 0, scale: 1, measured: !active });
  const measured = useRef(false);

  const onLayout = useCallback(() => {
    if (!active || measured.current || !origin) return;
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0) return;
      measured.current = true;
      from.set({
        dx: origin.x + origin.width / 2 - (x + width / 2),
        dy: origin.y + origin.height / 2 - (y + height / 2),
        scale: origin.width / width,
        measured: true,
      });
      // Départ à l'image suivante : l'écran natif vient d'être posé avec l'élément à l'origine.
      requestAnimationFrame(() => progress.set(withSpring(1, spring.gentle)));
    });
  }, [active, from, origin, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const f = from.get();
    return {
      opacity: f.measured ? FROM_OPACITY + (1 - FROM_OPACITY) * Math.min(1, p) : 0,
      transform: [
        { translateX: f.dx * (1 - p) },
        { translateY: f.dy * (1 - p) },
        { scale: f.scale + (1 - f.scale) * p },
      ],
    };
  });

  return { ref, onLayout, style, active };
}
