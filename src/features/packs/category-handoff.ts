import type { CategorySummary } from './repository';

/**
 * Catégorie touchée dans la grille, transmise à l'écran détail : il s'affiche aussitôt (pendant
 * la transition) au lieu d'attendre la base de données. Valeur consommée une seule fois.
 */
let pending: CategorySummary | null = null;

export function handOffCategory(category: CategorySummary): void {
  pending = category;
}

export function takeHandedOffCategory(id: number): CategorySummary | undefined {
  const found = pending;
  pending = null;
  return found && found.id === id ? found : undefined;
}
