// Validation des paquets (docs/pack.schema.json, docs/GAMEPLAY.md §5). Le schéma JSON fait foi ;
// ce fichier le traduit en zod et ajoute les limites que JSON Schema ne sait pas exprimer.
import { z } from 'zod';

import { categoryColors } from '@/ui/tokens';

export const regions = ['cm', 'africa', 'fr', 'us', 'world', 'party', 'custom'] as const;
export type Region = (typeof regions)[number];

export const variantIds = [
  'classic',
  'mime',
  'sounds',
  'one-word',
  'sing',
  'forbidden',
  'air-draw',
  'imitation',
  'mix',
] as const;
export type VariantId = (typeof variantIds)[number];

/** Limites de sécurité (GAMEPLAY.md §5, PROJET.md §4). */
export const packLimits = {
  maxFileBytes: 2 * 1024 * 1024,
  maxCategories: 100,
  maxWordsPerCategory: 5000,
  maxWordsPerPack: 20_000,
  minWordsPerCategory: 10,
  maxWordLength: 60,
  maxForbidden: 5,
} as const;

const id = z.string().regex(/^[a-z0-9-]{3,64}$/);

const localizedText = z.strictObject({
  fr: z.string().min(1).max(80),
  en: z.string().min(1).max(80).optional(),
});

const wordObject = z.strictObject({
  text: z.string().trim().min(1).max(packLimits.maxWordLength),
  hint: z.string().max(120).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  forbidden: z
    .array(z.string().min(1).max(40))
    .max(packLimits.maxForbidden)
    .refine((list) => new Set(list).size === list.length, 'mots interdits en double')
    .optional(),
});

const word = z.union([z.string().trim().min(1).max(packLimits.maxWordLength), wordObject]);

const category = z.strictObject({
  id,
  name: localizedText,
  description: localizedText.optional(),
  emoji: z.string().max(8).optional(),
  color: z.enum(categoryColors).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  variants: z
    .array(z.enum(variantIds))
    .min(1)
    .refine((list) => new Set(list).size === list.length, 'variantes en double')
    .optional(),
  words: z.array(word).min(packLimits.minWordsPerCategory).max(packLimits.maxWordsPerCategory),
});

export const packFileSchema = z.strictObject({
  format: z.literal('devine-pack'),
  formatVersion: z.literal(1),
  pack: z
    .strictObject({
      id,
      name: localizedText,
      description: localizedText.optional(),
      region: z.enum(regions).optional(),
      language: z
        .string()
        .regex(/^[a-z]{2}$/)
        .optional(),
      author: z.string().max(60).optional(),
      version: z.number().int().min(1),
      categories: z.array(category).min(1).max(packLimits.maxCategories),
    })
    .refine(
      (pack) =>
        pack.categories.reduce((total, c) => total + c.words.length, 0) <=
        packLimits.maxWordsPerPack,
      {
        message: `plus de ${packLimits.maxWordsPerPack} mots dans le paquet`,
        path: ['categories'],
      },
    ),
});

export type PackFile = z.infer<typeof packFileSchema>;
export type PackCategory = PackFile['pack']['categories'][number];
export type PackWord = PackCategory['words'][number];

/** Un mot sous sa forme complète (la forme courte « texte seul » est développée). */
export type NormalizedWord = {
  text: string;
  hint?: string;
  difficulty?: 1 | 2 | 3;
  forbidden: string[];
};

export function normalizeWord(entry: PackWord): NormalizedWord {
  if (typeof entry === 'string') return { text: entry.trim(), forbidden: [] };
  return {
    text: entry.text.trim(),
    hint: entry.hint,
    difficulty: entry.difficulty,
    forbidden: entry.forbidden ?? [],
  };
}
