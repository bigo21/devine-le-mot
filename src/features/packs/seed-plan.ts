// Logique pure de la mise à jour des paquets intégrés (docs/PROJET.md §4).
import { foldText } from './filter';
import { type NormalizedWord, normalizeWord, type PackFile } from './schema';

/** Faut-il (ré)écrire ce paquet ? Seulement s'il est absent ou plus ancien en base. */
export function needsUpdate(installedVersion: number | null, seedVersion: number): boolean {
  return installedVersion === null || installedVersion < seedVersion;
}

export type WordPlan = {
  insert: NormalizedWord[];
  /** Mots déjà présents (même texte) : indice, difficulté et mots interdits mis à jour. */
  update: NormalizedWord[];
  /** Mots retirés de la nouvelle version : supprimés, avec leur historique `seen_words`. */
  remove: string[];
};

/** Compare les mots en base (par texte) avec ceux du paquet, sans doublon. */
export function planWords(
  existingTexts: readonly string[],
  seed: readonly NormalizedWord[],
): WordPlan {
  const unique = [...new Map(seed.map((word) => [word.text, word])).values()];
  const existing = new Set(existingTexts);
  const incoming = new Set(unique.map((word) => word.text));
  return {
    insert: unique.filter((word) => !existing.has(word.text)),
    update: unique.filter((word) => existing.has(word.text)),
    remove: existingTexts.filter((text) => !incoming.has(text)),
  };
}

/**
 * Règles propres au contenu intégré (GAMEPLAY.md §4, pack.schema.json) : exactement 3 mots
 * interdits par mot, couleur et emoji présents, région renseignée, et « imitation » déclarée
 * par les catégories de personnalités. Renvoie la liste des problèmes (vide si tout va bien).
 */
export function builtinRuleViolations(file: PackFile): string[] {
  const problems: string[] = [];
  const { pack } = file;
  if (!pack.region) problems.push(`${pack.id} : région manquante`);
  for (const category of pack.categories) {
    const where = `${pack.id}/${category.id}`;
    if (!category.color) problems.push(`${where} : couleur manquante`);
    if (!category.emoji) problems.push(`${where} : emoji manquant`);
    if (category.tags?.includes('personnalites') && !category.variants?.includes('imitation')) {
      problems.push(`${where} : catégorie de personnalités sans la variante « imitation »`);
    }
    for (const entry of category.words) {
      const word = normalizeWord(entry);
      if (word.forbidden.length !== 3) {
        problems.push(
          `${where} : « ${word.text} » a ${word.forbidden.length} mots interdits (3 attendus)`,
        );
      }
      // Un mot interdit qui fait partie du mot à deviner ne sert à rien (on ne le dira pas),
      // et un mot interdit en plusieurs mots ne doit pas reprendre un mot significatif
      // (4 lettres ou plus) du mot à deviner : « fou rire » pour « Rire au mauvais moment ».
      const tokens = new Set(foldText(word.text).split(/[^a-z0-9]+/));
      for (const forbidden of word.forbidden) {
        const folded = foldText(forbidden);
        const shared = folded
          .split(/[^a-z0-9]+/)
          .some((token) => token.length >= 4 && tokens.has(token));
        if (folded === foldText(word.text) || tokens.has(folded) || shared) {
          problems.push(
            `${where} : « ${word.text} » interdit « ${forbidden} », qui fait partie du mot`,
          );
        }
      }
    }
  }
  return problems;
}
