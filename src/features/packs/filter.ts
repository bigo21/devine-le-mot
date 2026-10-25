// Filtres de l'écran Catégories (DESIGN.md §4) : logique pure, testable.
import type { CategorySummary } from './repository';
import type { Region } from './schema';

/** Pilules de filtre : toutes, une région, ou les catégories créées / importées. */
export const categoryFilters = [
  'all',
  'cm',
  'africa',
  'fr',
  'us',
  'world',
  'party',
  'mine',
] as const;
export type CategoryFilter = (typeof categoryFilters)[number];

/** Minuscules sans accents : « Gênantes » et « genantes » se valent. */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function matchesFilter(category: CategorySummary, filter: CategoryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'mine') return category.source !== 'builtin';
  return category.region === (filter satisfies Region);
}

/** Filtre par pilule puis par recherche (nom et étiquettes), sans changer l'ordre (favoris en tête). */
export function filterCategories(
  categories: readonly CategorySummary[],
  filter: CategoryFilter,
  query: string,
): CategorySummary[] {
  const needle = foldText(query);
  return categories.filter(
    (category) =>
      matchesFilter(category, filter) &&
      (needle === '' ||
        foldText(category.name).includes(needle) ||
        category.tags.some((tag) => foldText(tag).includes(needle))),
  );
}
