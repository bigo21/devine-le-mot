/**
 * Sélection de catégories pour la préparation : l'explorateur Catégories s'ouvre en mode
 * sélection avec la sélection en cours, chaque changement est noté ici, et la préparation le
 * relit en revenant au premier plan. Les changements valent tout de suite (retour compris).
 */
let current: number[] = [];
let picked: number[] | null = null;

/** Ouvre une sélection à partir des catégories déjà choisies. */
export function startPicking(ids: readonly number[]): void {
  current = [...ids];
  picked = null;
}

/** Catégories choisies au moment où l'explorateur s'ouvre. */
export function pickingIds(): number[] {
  return [...current];
}

/** Note la sélection modifiée dans l'explorateur. */
export function setPicked(ids: readonly number[]): void {
  current = [...ids];
  picked = [...ids];
}

/** Sélection modifiée depuis l'ouverture (une seule lecture), ou `null` si rien n'a changé. */
export function takePicked(): number[] | null {
  const result = picked;
  picked = null;
  return result;
}
