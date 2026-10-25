// Éditeur de catégorie (GAMEPLAY.md §5) : logique pure, testable. Une catégorie créée vit dans
// son propre paquet (source « user ») : l'export partage exactement cette catégorie.
import { type CategoryColor } from '@/ui/tokens';

import { foldText } from './filter';
import { type PackFile, packLimits, type VariantId } from './schema';

/** Seuils de l'éditeur (GAMEPLAY.md §3 et §5). */
export const editorLimits = {
  minWords: packLimits.minWordsPerCategory,
  warnBelow: 30,
  /** Un mot n'est tiré en « Mots interdits » qu'avec au moins 3 mots interdits. */
  minForbidden: 3,
  maxForbidden: packLimits.maxForbidden,
  /** La variante « Mots interdits » demande au moins 20 mots éligibles. */
  forbiddenThreshold: 20,
  maxNameLength: 40,
  maxDescriptionLength: 80,
  maxWordLength: packLimits.maxWordLength,
  maxForbiddenLength: 40,
} as const;

export type DraftWord = { text: string; forbidden: string[] };

export type CategoryDraft = {
  name: string;
  emoji: string;
  color: CategoryColor;
  description: string;
  words: DraftWord[];
  /** Conservés d'une catégorie dupliquée (Imitation des personnalités, étiquettes de recherche). */
  variants?: VariantId[] | null;
  tags?: string[];
};

export const emptyDraft = (emoji: string, color: CategoryColor): CategoryDraft => ({
  name: '',
  emoji,
  color,
  description: '',
  words: [],
});

// Puces et numéros qu'on trouve dans une liste copiée depuis une note ou WhatsApp : « - », « • »,
// « * », « 1. », « 2) ».
const LIST_MARKER = /^\s*(?:[-•*·–—]+|\d{1,3}[.)])\s+/;

/** Nettoie un mot saisi : puce de liste retirée, espaces réduits. */
export function cleanWord(raw: string): string {
  return raw.replace(LIST_MARKER, '').replace(/\s+/g, ' ').trim();
}

export type ParsedList = {
  /** Mots retenus, dans l'ordre, sans doublon (accents et majuscules ignorés). */
  words: string[];
  /** Lignes ignorées car déjà présentes (dans la liste ou dans `existing`). */
  duplicates: number;
  /** Lignes trop longues (au-delà de 60 caractères), ignorées. */
  tooLong: string[];
};

/** Une ligne = un mot ; lignes vides ignorées, doublons retirés automatiquement. */
export function parseWordList(text: string, existing: readonly string[] = []): ParsedList {
  const seen = new Set(existing.map(foldText));
  const words: string[] = [];
  const tooLong: string[] = [];
  let duplicates = 0;
  for (const line of text.split(/\r?\n/)) {
    const word = cleanWord(line);
    if (!word) continue;
    if (word.length > editorLimits.maxWordLength) {
      tooLong.push(word);
      continue;
    }
    const key = foldText(word);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    words.push(word);
  }
  return { words, duplicates, tooLong };
}

/** Ajoute des mots à la fin de la liste (doublons et mots trop longs ignorés). */
export function addWords(
  words: readonly DraftWord[],
  text: string,
): { words: DraftWord[]; result: ParsedList } {
  const result = parseWordList(
    text,
    words.map((w) => w.text),
  );
  return {
    words: [...words, ...result.words.map((t) => ({ text: t, forbidden: [] }))],
    result,
  };
}

/** Mots interdits d'un mot : nettoyés, sans doublon, sans le mot lui-même, 5 au plus. */
export function cleanForbidden(word: string, forbidden: readonly string[]): string[] {
  const target = foldText(word);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of forbidden) {
    const value = cleanWord(raw).slice(0, editorLimits.maxForbiddenLength);
    const key = foldText(value);
    if (!value || key === target || seen.has(key)) continue;
    seen.add(key);
    kept.push(value);
    if (kept.length === editorLimits.maxForbidden) break;
  }
  return kept;
}

export type DraftStatus = {
  wordCount: number;
  nameMissing: boolean;
  /** Moins de 10 mots : impossible d'enregistrer ou de jouer. */
  tooFewWords: boolean;
  /** Moins de 30 mots : avertissement (on retombe vite sur les mêmes). */
  fewWords: boolean;
  /** Mots ayant au moins 3 mots interdits. */
  forbiddenEligible: number;
  /** La variante « Mots interdits » sera proposée. */
  forbiddenVariant: boolean;
  canSave: boolean;
};

export function draftStatus(draft: CategoryDraft): DraftStatus {
  const wordCount = draft.words.length;
  const nameMissing = draft.name.trim() === '';
  const tooFewWords = wordCount < editorLimits.minWords;
  // Champs vides et doublons ne comptent pas : l'éditeur garde des cases vides pendant la saisie.
  const forbiddenEligible = draft.words.filter(
    (w) => cleanForbidden(w.text, w.forbidden).length >= editorLimits.minForbidden,
  ).length;
  return {
    wordCount,
    nameMissing,
    tooFewWords,
    fewWords: !tooFewWords && wordCount < editorLimits.warnBelow,
    forbiddenEligible,
    forbiddenVariant: forbiddenEligible >= editorLimits.forbiddenThreshold,
    canSave: !nameMissing && !tooFewWords,
  };
}

/** Identifiant lisible en kebab-case ASCII (3 à 64 caractères), pour les id et noms de fichiers. */
export function slugify(text: string, fallback = 'categorie'): string {
  const slug = foldText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug.length >= 3 ? slug : fallback;
}

/** Identifiant de paquet utilisateur : unique grâce au suffixe aléatoire. */
export function newPackId(name: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  return `perso-${slugify(name)}-${suffix}`;
}

/** Nom du fichier exporté : `nom-du-pack.devine.json` (GAMEPLAY.md §5). */
export function exportFileName(name: string): string {
  return `${slugify(name, 'paquet')}.devine.json`;
}

/** Paquet au format pack.schema.json pour une catégorie de l'éditeur. */
export function draftToPackFile(
  draft: CategoryDraft,
  packId: string,
  version: number,
  categorySlug = slugify(draft.name),
): PackFile {
  const name = { fr: draft.name.trim() };
  const description = draft.description.trim() ? { fr: draft.description.trim() } : undefined;
  return {
    format: 'devine-pack',
    formatVersion: 1,
    pack: {
      id: packId,
      name,
      ...(description ? { description } : {}),
      region: 'custom',
      language: 'fr',
      version,
      categories: [
        {
          id: categorySlug,
          name,
          ...(description ? { description } : {}),
          emoji: draft.emoji,
          color: draft.color,
          ...(draft.tags && draft.tags.length > 0 ? { tags: draft.tags } : {}),
          ...(draft.variants && draft.variants.length > 0 ? { variants: draft.variants } : {}),
          words: draft.words.map((w) => {
            const forbidden = cleanForbidden(w.text, w.forbidden);
            return forbidden.length > 0 ? { text: w.text, forbidden } : w.text;
          }),
        },
      ],
    },
  };
}
