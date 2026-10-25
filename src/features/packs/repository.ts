// Accès SQLite aux paquets, catégories et mots (schéma : src/lib/db/migrations.ts).
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Card } from '@/features/game/engine';
import { type CategoryColor, categoryColors } from '@/ui/tokens';

import { normalizeWord, type PackFile, packFileSchema, type Region } from './schema';
import { builtinPackFiles } from './seed';
import { needsUpdate, planWords } from './seed-plan';

/** Mots vus récemment : écartés en priorité du tirage (GAMEPLAY.md §4). */
const RECENTLY_SEEN_MS = 14 * 24 * 60 * 60 * 1000;

const json = (value: unknown) => JSON.stringify(value);

// --- Paquets intégrés ---------------------------------------------------------------------------

async function upsertBuiltinPack(db: SQLiteDatabase, file: PackFile, now: number): Promise<void> {
  const { pack } = file;
  const installed = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM packs WHERE id = ?',
    pack.id,
  );
  if (!needsUpdate(installed?.version ?? null, pack.version)) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO packs (id, name_fr, name_en, description_fr, description_en, region, language,
         author, source, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'builtin', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name_fr = excluded.name_fr, name_en = excluded.name_en,
         description_fr = excluded.description_fr, description_en = excluded.description_en,
         region = excluded.region, language = excluded.language, author = excluded.author,
         version = excluded.version, updated_at = excluded.updated_at`,
      pack.id,
      pack.name.fr,
      pack.name.en ?? null,
      pack.description?.fr ?? null,
      pack.description?.en ?? null,
      pack.region ?? 'custom',
      pack.language ?? 'fr',
      pack.author ?? null,
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
           tags, color, emoji, variants, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  });
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
  };
}

const SUMMARY_SELECT = `
  SELECT c.id, c.name_fr, c.name_en, c.emoji, c.color, c.is_favorite, c.tags, p.region, p.source,
    (SELECT COUNT(*) FROM words w WHERE w.category_id = c.id) AS word_count
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

/** Cartes jouables d'une catégorie. */
export async function getCategoryCards(db: SQLiteDatabase, categoryId: number): Promise<Card[]> {
  const rows = await db.getAllAsync<{ id: number; text: string; forbidden: string }>(
    'SELECT id, text, forbidden FROM words WHERE category_id = ?',
    categoryId,
  );
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    forbidden: JSON.parse(row.forbidden) as string[],
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

/** Mots de la catégorie vus ces deux dernières semaines. */
export async function recentlySeenWords(
  db: SQLiteDatabase,
  categoryId: number,
  now = Date.now(),
): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ word_id: number }>(
    `SELECT s.word_id FROM seen_words s JOIN words w ON w.id = s.word_id
     WHERE w.category_id = ? AND s.last_seen_at >= ?`,
    categoryId,
    now - RECENTLY_SEEN_MS,
  );
  return new Set(rows.map((row) => row.word_id));
}

export type RoundRecord = {
  playedAt: number;
  categoryId: number;
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
      json([round.categoryId]),
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
