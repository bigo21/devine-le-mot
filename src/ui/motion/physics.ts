// Petits calculs physiques pour les gestes (worklets purs, testables).

/** Distance supplémentaire qu'un geste lancé à `velocity` (px/s) parcourrait avant de s'arrêter. */
export function project(velocity: number, decelerationRate = 0.998): number {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Résistance élastique au-delà d'une limite : plus on dépasse, moins l'élément suit. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
