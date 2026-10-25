// Accès SQLite aux paquets, catégories et mots (schéma : src/lib/db/migrations.ts).
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Card } from '@/features/game/engine';
import { type CategoryColor, categoryColors } from '@/ui/tokens';

import { type CategoryDraft, draftToPackFile, newPackId, slugify } from './editor';
import { type ExistingSource } from './import';
import {
  normalizeWord,
  type PackFile,
  packFileSchema,
  type Region,
  type VariantId,
} from './schema';
import { builtinPackFiles } from './seed';
import { needsUpdate, planWords } from './seed-plan';

/** Mots vus récemment : écartés en priorité du tirage (GAMEPLAY.md §4). */
const RECENTLY_SEEN_MS = 14 * 24 * 60 * 60 * 1000;

const json = (value: unknown) => JSON.stringify(value);

// --- Paquets intégrés ---------------------------------------------------------------------------

type Source = 'builtin' | 'user' | 'imported';
type Txn = Parameters<Parameters<SQLiteDatabase['withExclusiveTransactionAsync']>[0]>[0];

/**
 * Écrit un paquet (création ou mise à jour) : catégories retrouvées par slug, mots par texte.
 * Favoris, masquage et `seen_words` des mots conservés sont préservés ; les mots et catégories
 * retirés sont supprimés (avec leur historique, ON DELETE CASCADE).
 */
async function writePack(
  txn: Txn,
  file: PackFile,
  source: Source,
  now: number,
  duplicatedFrom: number | null = null,
): Promise<void> {
  const { pack } = file;
  await txn.runAsync(
    `INSERT INTO packs (id, name_fr, name_en, description_fr, description_en, region, language,
       author, source, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name_fr = excluded.name_fr, name_en = excluded.name_en,
       description_fr = excluded.description_fr, description_en = excluded.description_en,
       region = excluded.region, language = excluded.language, author = excluded.author,
       source = excluded.source, version = excluded.version, updated_at = excluded.updated_at`,
    pack.id,
    pack.name.fr,
    pack.name.en ?? null,
    pack.description?.fr ?? null,
    pack.description?.en ?? null,
    pack.region ?? 'custom',
    pack.language ?? 'fr',
    pack.author ?? null,
    source,
    pack.version,
    now,
    now,
  );

  const keptSlugs = pack.categories.map((category) => category.id);
  await txn.runAsync(
    `DELETE FROM categories WHERE pack_id = ? AND slug NOT IN (${keptSlugs.map(() => '?').join(', ')})`,
    pack.id,
    ...keptSlugs,
  );

  for (const [position, category] of pack.categories.entries()) {
    // Favoris et masquage sont préservés : on met à jour la ligne existante.
    await txn.runAsync(
      `INSERT INTO categories (pack_id, slug, name_fr, name_en, description_fr, description_en,
         tags, color, emoji, variants, position, duplicated_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pack_id, slug) DO UPDATE SET name_fr = excluded.name_fr,
         name_en = excluded.name_en, description_fr = excluded.description_fr,
         description_en = excluded.description_en, tags = excluded.tags, color = excluded.color,
         emoji = excluded.emoji, variants = excluded.variants, position = excluded.position`,
      pack.id,
      category.id,
      category.name.fr,
      category.name.en ?? null,
      category.description?.fr ?? null,
      category.description?.en ?? null,
      json(category.tags ?? []),
      category.color ?? null,
      category.emoji ?? null,
      category.variants ? json(category.variants) : null,
      position,
      duplicatedFrom,
    );
    const row = await txn.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE pack_id = ? AND slug = ?',
      pack.id,
      category.id,
    );
    if (!row) continue;

    const existing = await txn.getAllAsync<{ text: string }>(
      'SELECT text FROM words WHERE category_id = ?',
      row.id,
    );
    const plan = planWords(
      existing.map((w) => w.text),
      category.words.map(normalizeWord),
    );
    for (const text of plan.remove) {
      // ON DELETE CASCADE : l'historique seen_words de ce mot part avec lui.
      await txn.runAsync('DELETE FROM words WHERE category_id = ? AND text = ?', row.id, text);
    }
    for (const word of plan.update) {
      await txn.runAsync(
        'UPDATE words SET hint = ?, difficulty = ?, forbidden = ? WHERE category_id = ? AND text = ?',
        word.hint ?? null,
        word.difficulty ?? null,
        json(word.forbidden),
        row.id,
        word.text,
      );
    }
    for (const word of plan.insert) {
      await txn.runAsync(
        'INSERT INTO words (category_id, text, hint, difficulty, forbidden) VALUES (?, ?, ?, ?, ?)',
        row.id,
        word.text,
        word.hint ?? null,
        word.difficulty ?? null,
        json(word.forbidden),
      );
    }
  }
}

async function upsertBuiltinPack(db: SQLiteDatabase, file: PackFile, now: number): Promise<void> {
  const installed = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM packs WHERE id = ?',
    file.pack.id,
  );
  if (!needsUpdate(installed?.version ?? null, file.pack.version)) return;
  await db.withExclusiveTransactionAsync((txn) => writePack(txn, file, 'builtin', now));
}

/** Insère ou met à jour les paquets intégrés (au démarrage, après les migrations). */
export async function seedBuiltinPacks(db: SQLiteDatabase, now = Date.now()): Promise<void> {
  for (const file of builtinPackFiles) {
    const parsed = packFileSchema.safeParse(file);
    // Un paquet intégré invalide est une erreur de développement (les tests la détectent) :
    // on l'ignore plutôt que d'empêcher l'app de démarrer.
    if (parsed.success) await upsertBuiltinPack(db, parsed.data, now);
  }
}

// --- Lecture ------------------------------------------------------------------------------------

export type CategorySummary = {
  id: number;
  name: string;
  emoji: string | null;
  color: CategoryColor;
  region: Region;
  source: 'builtin' | 'user' | 'imported';
  wordCount: number;
  favorite: boolean;
  tags: string[];
  /** Variantes déclarées (`null` = variantes par défaut, GAMEPLAY.md §3). */
  variants: VariantId[] | null;
  /** Mots ayant au moins 3 mots interdits (variante « Mots interdits »). */
  forbiddenEligible: number;
};

type CategoryRow = {
  id: number;
  name_fr: string;
  name_en: string | null;
  emoji: string | null;
  color: string | null;
  region: Region;
  source: CategorySummary['source'];
  word_count: number;
  is_favorite: number;
  tags: string;
  variants: string | null;
  forbidden_eligible: number;
};

const isCategoryColor = (value: string | null): value is CategoryColor =>
  categoryColors.some((color) => color === value);

function toSummary(row: CategoryRow, language: string): CategorySummary {
  return {
    id: row.id,
    name: language === 'en' && row.name_en ? row.name_en : row.name_fr,
    emoji: row.emoji,
    // Couleur absente ou hors palette (ancien paquet importé) : couleur par défaut.
    color: isCategoryColor(row.color) ? row.color : 'lagoon',
    region: row.region,
    source: row.source,
    wordCount: row.word_count,
    favorite: row.is_favorite === 1,
    tags: JSON.parse(row.tags) as string[],
    variants: row.variants ? (JSON.parse(row.variants) as VariantId[]) : null,
    forbiddenEligible: row.forbidden_eligible,
  };
}

const SUMMARY_SELECT = `
  SELECT c.id, c.name_fr, c.name_en, c.emoji, c.color, c.is_favorite, c.tags, c.variants,
    p.region, p.source,
    (SELECT COUNT(*) FROM words w WHERE w.category_id = c.id) AS word_count,
    (SELECT COUNT(*) FROM words w
      WHERE w.category_id = c.id AND json_array_length(w.forbidden) >= 3) AS forbidden_eligible
  FROM categories c JOIN packs p ON p.id = c.pack_id`;

/** Catégories visibles, favoris en tête (DESIGN.md §4). */
export async function listCategories(
  db: SQLiteDatabase,
  language: string,
): Promise<CategorySummary[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    `${SUMMARY_SELECT} WHERE c.is_hidden = 0
     ORDER BY c.is_favorite DESC, p.region, c.position, c.name_fr COLLATE NOCASE`,
  );
  return rows.map((row) => toSummary(row, language));
}

export async function getCategory(
  db: SQLiteDatabase,
  id: number,
  language: string,
): Promise<CategorySummary | null> {
  const row = await db.getFirstAsync<CategoryRow>(`${SUMMARY_SELECT} WHERE c.id = ?`, id);
  return row ? toSummary(row, language) : null;
}

const placeholders = (ids: readonly number[]) => ids.map(() => '?').join(', ');

/** Cartes jouables d'une ou plusieurs catégories (mélangées par le moteur). */
export async function getCategoryCards(
  db: SQLiteDatabase,
  categoryIds: number | readonly number[],
): Promise<Card[]> {
  const ids = typeof categoryIds === 'number' ? [categoryIds] : categoryIds;
  if (ids.length === 0) return [];
  const rows = await db.getAllAsync<{
    id: number;
    text: string;
    forbidden: string;
    category_id: number;
  }>(
    `SELECT id, text, forbidden, category_id FROM words WHERE category_id IN (${placeholders(ids)})`,
    ...ids,
  );
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    forbidden: JSON.parse(row.forbidden) as string[],
    categoryId: row.category_id,
  }));
}

/** Quelques mots au hasard, pour l'aperçu à l'appui long. */
export async function previewWords(
  db: SQLiteDatabase,
  categoryId: number,
  limit = 8,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ text: string }>(
    'SELECT text FROM words WHERE category_id = ? ORDER BY RANDOM() LIMIT ?',
    categoryId,
    limit,
  );
  return rows.map((row) => row.text);
}

export async function setFavorite(
  db: SQLiteDatabase,
  categoryId: number,
  favorite: boolean,
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET is_favorite = ? WHERE id = ?',
    favorite ? 1 : 0,
    categoryId,
  );
}

// --- Historique ---------------------------------------------------------------------------------

/** Mots des catégories vus ces deux dernières semaines. */
export async function recentlySeenWords(
  db: SQLiteDatabase,
  categoryIds: number | readonly number[],
  now = Date.now(),
): Promise<Set<number>> {
  const ids = typeof categoryIds === 'number' ? [categoryIds] : categoryIds;
  if (ids.length === 0) return new Set();
  const rows = await db.getAllAsync<{ word_id: number }>(
    `SELECT s.word_id FROM seen_words s JOIN words w ON w.id = s.word_id
     WHERE w.category_id IN (${placeholders(ids)}) AND s.last_seen_at >= ?`,
    ...ids,
    now - RECENTLY_SEEN_MS,
  );
  return new Set(rows.map((row) => row.word_id));
}

export type RoundRecord = {
  playedAt: number;
  categoryIds: readonly number[];
  variant: string;
  durationS: number;
  score: number;
  words: { id: number; text: string; result: 'found' | 'passed' }[];
};

/** Enregistre une manche terminée et marque ses mots comme vus. */
export async function recordRound(db: SQLiteDatabase, round: RoundRecord): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO rounds (played_at, category_ids, variant, duration_s, score, words)
       VALUES (?, ?, ?, ?, ?, ?)`,
      round.playedAt,
      json(round.categoryIds),
      round.variant,
      round.durationS,
      round.score,
      json(round.words),
    );
    for (const word of round.words) {
      await txn.runAsync(
        `INSERT INTO seen_words (word_id, last_seen_at) VALUES (?, ?)
         ON CONFLICT(word_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
        word.id,
        round.playedAt,
      );
    }
    // Purge : au-delà de deux semaines, un mot redevient « jamais vu ».
    await txn.runAsync(
      'DELETE FROM seen_words WHERE last_seen_at < ?',
      round.playedAt - RECENTLY_SEEN_MS,
    );
  });
}

// --- Catégories créées, dupliquées et importées (GAMEPLAY.md §5) -------------------------------

/** Brouillon d'éditeur d'une catégorie existante, avec ce qui décide des actions possibles. */
export type EditableCategory = {
  draft: CategoryDraft;
  packId: string;
  source: Source;
  /** Le paquet ne contient que cette catégorie (créée dans l'éditeur, ou importée seule). */
  alone: boolean;
};

export async function getEditableCategory(
  db: SQLiteDatabase,
  categoryId: number,
): Promise<EditableCategory | null> {
  const row = await db.getFirstAsync<{
    pack_id: string;
    source: Source;
    name_fr: string;
    description_fr: string | null;
    emoji: string | null;
    color: string | null;
    tags: string;
    variants: string | null;
    siblings: number;
  }>(
    `SELECT c.pack_id, p.source, c.name_fr, c.description_fr, c.emoji, c.color, c.tags, c.variants,
       (SELECT COUNT(*) FROM categories s WHERE s.pack_id = c.pack_id) AS siblings
     FROM categories c JOIN packs p ON p.id = c.pack_id WHERE c.id = ?`,
    categoryId,
  );
  if (!row) return null;
  const words = await db.getAllAsync<{ text: string; forbidden: string }>(
    'SELECT text, forbidden FROM words WHERE category_id = ? ORDER BY id',
    categoryId,
  );
  return {
    packId: row.pack_id,
    source: row.source,
    alone: row.siblings === 1,
    draft: {
      name: row.name_fr,
      description: row.description_fr ?? '',
      emoji: row.emoji ?? '',
      color: isCategoryColor(row.color) ? row.color : 'lagoon',
      words: words.map((w) => ({ text: w.text, forbidden: JSON.parse(w.forbidden) as string[] })),
      tags: JSON.parse(row.tags) as string[],
      variants: row.variants ? (JSON.parse(row.variants) as VariantId[]) : null,
    },
  };
}

/**
 * Enregistre une catégorie de l'éditeur. Sans `categoryId` : nouveau paquet utilisateur. Avec :
 * mise à jour de la catégorie (jamais d'une catégorie intégrée, en lecture seule).
 * Renvoie l'id de la catégorie.
 */
export async function saveUserCategory(
  db: SQLiteDatabase,
  draft: CategoryDraft,
  options: { categoryId?: number; duplicatedFrom?: number } = {},
  now = Date.now(),
): Promise<number> {
  let packId = newPackId(draft.name);
  let version = 1;
  let slug = slugify(draft.name);

  if (options.categoryId !== undefined) {
    const current = await db.getFirstAsync<{
      pack_id: string;
      slug: string;
      source: Source;
      version: number;
    }>(
      `SELECT c.pack_id, c.slug, p.source, p.version
       FROM categories c JOIN packs p ON p.id = c.pack_id WHERE c.id = ?`,
      options.categoryId,
    );
    if (!current || current.source === 'builtin') throw new Error('catégorie non modifiable');
    packId = current.pack_id;
    version = current.version + 1;
    slug = current.slug;
  }

  const file = draftToPackFile(draft, packId, version, slug);
  const category = file.pack.categories[0]!;
  await db.withExclusiveTransactionAsync(async (txn) => {
    if (options.categoryId === undefined) {
      await writePack(txn, file, 'user', now, options.duplicatedFrom ?? null);
      return;
    }
    // Paquet importé à plusieurs catégories : on ne réécrit que celle-ci, pas tout le paquet.
    await txn.runAsync(
      'UPDATE packs SET version = ?, updated_at = ? WHERE id = ?',
      version,
      now,
      packId,
    );
    const siblings = await txn.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories WHERE pack_id = ?',
      packId,
    );
    if (siblings?.n === 1) {
      await txn.runAsync(
        'UPDATE packs SET name_fr = ?, description_fr = ? WHERE id = ?',
        file.pack.name.fr,
        file.pack.description?.fr ?? null,
        packId,
      );
    }
    await writeCategory(txn, packId, category, options.categoryId!);
  });

  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE pack_id = ? AND slug = ?',
    packId,
    slug,
  );
  if (!row) throw new Error('catégorie introuvable après enregistrement');
  return row.id;
}

/** Met à jour une catégorie et ses mots (mots conservés : historique `seen_words` préservé). */
async function writeCategory(
  txn: Txn,
  packId: string,
  category: PackFile['pack']['categories'][number],
  categoryId: number,
): Promise<void> {
  await txn.runAsync(
    `UPDATE categories SET name_fr = ?, description_fr = ?, color = ?, emoji = ?
     WHERE id = ? AND pack_id = ?`,
    category.name.fr,
    category.description?.fr ?? null,
    category.color ?? null,
    category.emoji ?? null,
    categoryId,
    packId,
  );
  const existing = await txn.getAllAsync<{ text: string }>(
    'SELECT text FROM words WHERE category_id = ?',
    categoryId,
  );
  const plan = planWords(
    existing.map((w) => w.text),
    category.words.map(normalizeWord),
  );
  for (const text of plan.remove) {
    await txn.runAsync('DELETE FROM words WHERE category_id = ? AND text = ?', categoryId, text);
  }
  for (const word of plan.update) {
    await txn.runAsync(
      'UPDATE words SET forbidden = ? WHERE category_id = ? AND text = ?',
      json(word.forbidden),
      categoryId,
      word.text,
    );
  }
  for (const word of plan.insert) {
    await txn.runAsync(
      'INSERT INTO words (category_id, text, forbidden) VALUES (?, ?, ?)',
      categoryId,
      word.text,
      json(word.forbidden),
    );
  }
}

/**
 * Supprime une catégorie créée ou importée (jamais une intégrée), et son paquet s'il devient vide.
 */
export async function deleteUserCategory(db: SQLiteDatabase, categoryId: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<{ pack_id: string; source: Source }>(
      'SELECT c.pack_id, p.source FROM categories c JOIN packs p ON p.id = c.pack_id WHERE c.id = ?',
      categoryId,
    );
    if (!row || row.source === 'builtin') return;
    await txn.runAsync('DELETE FROM categories WHERE id = ?', categoryId);
    await txn.runAsync(
      'DELETE FROM packs WHERE id = ? AND NOT EXISTS (SELECT 1 FROM categories WHERE pack_id = ?)',
      row.pack_id,
      row.pack_id,
    );
  });
}

/** Source du paquet déjà installé sous cet `id` (conflit d'import), ou `null`. */
export async function existingPackSource(
  db: SQLiteDatabase,
  packId: string,
): Promise<ExistingSource> {
  const row = await db.getFirstAsync<{ source: Source }>(
    'SELECT source FROM packs WHERE id = ?',
    packId,
  );
  return row?.source ?? null;
}

export async function allPackIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM packs');
  return new Set(rows.map((row) => row.id));
}

/**
 * Importe un paquet (déjà validé, conflit déjà résolu). « Remplacer » : le paquet existant est
 * effacé puis réécrit. Renvoie l'id de la première catégorie, pour « Jouer avec ».
 */
export async function importPack(
  db: SQLiteDatabase,
  file: PackFile,
  options: { replace?: boolean } = {},
  now = Date.now(),
): Promise<number | null> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    if (options.replace) {
      // Garde-fou : un paquet intégré n'est jamais remplacé.
      await txn.runAsync("DELETE FROM packs WHERE id = ? AND source != 'builtin'", file.pack.id);
    }
    await writePack(txn, file, 'imported', now);
  });
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE pack_id = ? ORDER BY position LIMIT 1',
    file.pack.id,
  );
  return row?.id ?? null;
}

/** Paquet complet d'une catégorie, au format pack.schema.json, pour l'export. */
export async function exportPackOf(
  db: SQLiteDatabase,
  categoryId: number,
): Promise<PackFile | null> {
  const pack = await db.getFirstAsync<{
    id: string;
    name_fr: string;
    name_en: string | null;
    description_fr: string | null;
    description_en: string | null;
    region: Region;
    language: string;
    author: string | null;
    version: number;
  }>(
    `SELECT p.id, p.name_fr, p.name_en, p.description_fr, p.description_en, p.region, p.language,
       p.author, p.version
     FROM packs p JOIN categories c ON c.pack_id = p.id WHERE c.id = ?`,
    categoryId,
  );
  if (!pack) return null;
  const categories = await db.getAllAsync<{
    id: number;
    slug: string;
    name_fr: string;
    name_en: string | null;
    description_fr: string | null;
    description_en: string | null;
    emoji: string | null;
    color: string | null;
    tags: string;
    variants: string | null;
  }>(
    `SELECT id, slug, name_fr, name_en, description_fr, description_en, emoji, color, tags,
       variants
     FROM categories WHERE pack_id = ? ORDER BY position`,
    pack.id,
  );
  const localized = (fr: string, en: string | null) => ({ fr, ...(en ? { en } : {}) });
  const exported = {
    format: 'devine-pack',
    formatVersion: 1,
    pack: {
      id: pack.id,
      name: localized(pack.name_fr, pack.name_en),
      ...(pack.description_fr
        ? { description: localized(pack.description_fr, pack.description_en) }
        : {}),
      region: pack.region,
      language: pack.language,
      ...(pack.author ? { author: pack.author } : {}),
      version: pack.version,
      categories: await Promise.all(
        categories.map(async (c) => {
          const words = await db.getAllAsync<{
            text: string;
            hint: string | null;
            difficulty: number | null;
            forbidden: string;
          }>(
            'SELECT text, hint, difficulty, forbidden FROM words WHERE category_id = ? ORDER BY id',
            c.id,
          );
          const tags = JSON.parse(c.tags) as string[];
          return {
            id: c.slug,
            name: localized(c.name_fr, c.name_en),
            ...(c.description_fr
              ? { description: localized(c.description_fr, c.description_en) }
              : {}),
            ...(c.emoji ? { emoji: c.emoji } : {}),
            ...(isCategoryColor(c.color) ? { color: c.color } : {}),
            ...(tags.length > 0 ? { tags } : {}),
            ...(c.variants ? { variants: JSON.parse(c.variants) as string[] } : {}),
            words: words.map((w) => {
              const forbidden = JSON.parse(w.forbidden) as string[];
              if (!w.hint && !w.difficulty && forbidden.length === 0) return w.text;
              return {
                text: w.text,
                ...(w.hint ? { hint: w.hint } : {}),
                ...(w.difficulty ? { difficulty: w.difficulty } : {}),
                ...(forbidden.length > 0 ? { forbidden } : {}),
              };
            }),
          };
        }),
      ),
    },
  };
  // Validation : on n'exporte jamais un fichier que l'import refuserait.
  const parsed = packFileSchema.safeParse(exported);
  return parsed.success ? parsed.data : null;
}
