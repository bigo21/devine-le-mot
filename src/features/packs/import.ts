// Import de paquets (GAMEPLAY.md §5) : logique pure, testable. Les messages affichés sont dans
// l'i18n ; ici on ne renvoie que des codes et des positions (« catégorie 2, mot 15 »).
import type { z } from 'zod';

import { slugify } from './editor';
import { normalizeWord, type PackFile, packFileSchema, packLimits } from './schema';

export type IssueKind =
  | 'tooFewWords'
  | 'tooManyWords'
  | 'tooManyCategories'
  | 'tooManyPackWords'
  | 'wordTooLong'
  | 'wordEmpty'
  | 'nameMissing'
  | 'nameTooLong'
  | 'badId'
  | 'duplicateForbidden'
  | 'tooManyForbidden'
  | 'badColor'
  | 'badVariant'
  | 'other';

export type ImportIssue = {
  kind: IssueKind;
  /** Position humaine, à partir de 1. */
  category?: number;
  word?: number;
};

export type ImportError =
  | { code: 'tooLarge' }
  | { code: 'empty' }
  | { code: 'notJson' }
  | { code: 'notAPack' }
  | { code: 'unsupportedVersion' }
  | { code: 'invalid'; issues: ImportIssue[] };

export type ParseResult = { ok: true; file: PackFile } | { ok: false; error: ImportError };

/** Nombre d'erreurs détaillées montrées au joueur (au-delà, « et N autres »). */
export const MAX_SHOWN_ISSUES = 5;

function locate(path: readonly PropertyKey[]): Pick<ImportIssue, 'category' | 'word'> {
  const at = (key: string) => {
    const index = path.indexOf(key);
    const value = index >= 0 ? path[index + 1] : undefined;
    return typeof value === 'number' ? value + 1 : undefined;
  };
  return { category: at('categories'), word: at('words') };
}

function kindOf(issue: z.core.$ZodIssue): IssueKind {
  const last = issue.path[issue.path.length - 1];
  const inWords = issue.path.includes('words');
  const inForbidden = issue.path.includes('forbidden');
  if (issue.code === 'custom' && issue.message.includes('interdits')) return 'duplicateForbidden';
  if (issue.code === 'custom' && issue.path.join('.') === 'pack.categories') {
    return 'tooManyPackWords';
  }
  if (issue.code === 'too_small' && last === 'words') return 'tooFewWords';
  if (issue.code === 'too_big' && last === 'words') return 'tooManyWords';
  if (issue.code === 'too_big' && last === 'categories') return 'tooManyCategories';
  if (inForbidden && issue.code === 'too_big' && last === 'forbidden') return 'tooManyForbidden';
  if (inWords && !inForbidden && issue.code === 'too_big') return 'wordTooLong';
  if (inWords && !inForbidden && issue.code === 'too_small') return 'wordEmpty';
  if (issue.path.includes('name')) return issue.code === 'too_big' ? 'nameTooLong' : 'nameMissing';
  if (last === 'id') return 'badId';
  if (last === 'color') return 'badColor';
  if (issue.path.includes('variants')) return 'badVariant';
  return 'other';
}

/** Problèmes d'un paquet invalide, sans doublon (une même erreur par position). */
export function describeIssues(error: z.ZodError): ImportIssue[] {
  const seen = new Set<string>();
  const issues: ImportIssue[] = [];
  for (const raw of error.issues) {
    // Un mot qui n'est ni du texte ni un objet valide produit une erreur « union » : on la
    // ramène à ses causes (texte trop long, vide…).
    const nested =
      raw.code === 'invalid_union' && raw.errors.length > 0
        ? raw.errors.flat().map((inner) => ({ ...inner, path: [...raw.path, ...inner.path] }))
        : [raw];
    for (const issue of nested) {
      const described = { kind: kindOf(issue), ...locate(issue.path) };
      const key = `${described.kind}:${described.category}:${described.word}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(described);
    }
  }
  return issues;
}

/** Lit le texte d'un fichier `.devine.json` et le valide (limites de sécurité comprises). */
export function parsePackText(text: string, byteSize = text.length): ParseResult {
  if (byteSize > packLimits.maxFileBytes) return { ok: false, error: { code: 'tooLarge' } };
  if (text.trim() === '') return { ok: false, error: { code: 'empty' } };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: 'notJson' } };
  }
  if (typeof data !== 'object' || data === null || !('pack' in data) || !('format' in data)) {
    return { ok: false, error: { code: 'notAPack' } };
  }
  if ((data as { format: unknown }).format !== 'devine-pack') {
    return { ok: false, error: { code: 'notAPack' } };
  }
  if ((data as { formatVersion?: unknown }).formatVersion !== 1) {
    return { ok: false, error: { code: 'unsupportedVersion' } };
  }
  const parsed = packFileSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: { code: 'invalid', issues: describeIssues(parsed.error) } };
  }
  return { ok: true, file: parsed.data };
}

export type PackSummary = {
  name: string;
  categories: { name: string; emoji?: string; words: number }[];
  words: number;
  author?: string;
};

export function summarizePack(file: PackFile): PackSummary {
  const categories = file.pack.categories.map((c) => ({
    name: c.name.fr,
    emoji: c.emoji,
    words: c.words.length,
  }));
  return {
    name: file.pack.name.fr,
    categories,
    words: categories.reduce((total, c) => total + c.words, 0),
    author: file.pack.author,
  };
}

/** Source d'un paquet déjà installé portant le même `id`, ou `null`. */
export type ExistingSource = 'builtin' | 'user' | 'imported' | null;

/**
 * Conflit d'`id` (GAMEPLAY.md §5) : un paquet intégré n'est jamais remplacé (copie automatique) ;
 * un paquet utilisateur ou importé demande « Remplacer » ou « Garder les deux ».
 */
export type ConflictPlan = 'insert' | 'copy' | 'ask';

export function conflictPlan(existing: ExistingSource): ConflictPlan {
  if (existing === null) return 'insert';
  if (existing === 'builtin') return 'copy';
  return 'ask';
}

/** Copie d'un paquet : nouvel `id` libre, nom suffixé « (copie) » (suffixe fourni par l'i18n). */
export function copyOf(
  file: PackFile,
  takenIds: ReadonlySet<string>,
  copySuffix: string,
  random: () => number = Math.random,
): PackFile {
  const base = slugify(file.pack.id, 'paquet').slice(0, 50);
  let id = `${base}-copie`;
  while (takenIds.has(id)) {
    id = `${base}-copie-${Math.floor(random() * 36 ** 4).toString(36)}`;
  }
  const suffix = (name: string) => `${name} ${copySuffix}`.slice(0, 80);
  return {
    ...file,
    pack: {
      ...file.pack,
      id,
      name: {
        ...file.pack.name,
        fr: suffix(file.pack.name.fr),
        ...(file.pack.name.en ? { en: suffix(file.pack.name.en) } : {}),
      },
      categories:
        file.pack.categories.length === 1
          ? file.pack.categories.map((c) => ({
              ...c,
              name: {
                ...c.name,
                fr: suffix(c.name.fr),
                ...(c.name.en ? { en: suffix(c.name.en) } : {}),
              },
            }))
          : file.pack.categories,
    },
  };
}

/** Texte brut collé ou partagé : ressemble-t-il à un paquet JSON plutôt qu'à une liste de mots ? */
export function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/** Mots d'un paquet sous forme normalisée (pour l'aperçu). */
export function previewWordsOf(file: PackFile, limit = 8): string[] {
  return file.pack.categories
    .flatMap((c) => c.words.map((w) => normalizeWord(w).text))
    .slice(0, limit);
}
