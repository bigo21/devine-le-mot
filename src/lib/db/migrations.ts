// Schéma SQLite de docs/PROJET.md §4. Une migration n'est jamais modifiée une fois publiée :
// on en ajoute une nouvelle à la fin du tableau.
//
// Identifiants : les `id` des paquets (texte) viennent du format pack.schema.json et sont
// uniques. Les `id` de catégories du format ne sont uniques qu'au sein d'un paquet (une copie
// importée garde les mêmes) : ils sont stockés dans `slug`, et les catégories et les mots ont une
// clé entière locale. L'upsert du seed retrouve une catégorie par (pack_id, slug) et un mot par
// (category_id, text), ce qui préserve favoris, masquage et `seen_words`.

export type Migration = { version: number; sql: string };

export const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
CREATE TABLE packs (
  id TEXT PRIMARY KEY NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  description_fr TEXT,
  description_en TEXT,
  region TEXT NOT NULL DEFAULT 'custom'
    CHECK (region IN ('cm', 'africa', 'fr', 'us', 'world', 'party', 'custom')),
  language TEXT NOT NULL DEFAULT 'fr',
  author TEXT,
  emoji TEXT,
  color TEXT,
  source TEXT NOT NULL CHECK (source IN ('builtin', 'user', 'imported')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id TEXT NOT NULL REFERENCES packs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  description_fr TEXT,
  description_en TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  color TEXT,
  emoji TEXT,
  variants TEXT,
  duplicated_from INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (pack_id, slug)
);

CREATE TABLE words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  hint TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 3),
  forbidden TEXT NOT NULL DEFAULT '[]',
  UNIQUE (category_id, text)
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  rounds_planned INTEGER NOT NULL,
  teams TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'finished'))
);

CREATE TABLE rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  played_at INTEGER NOT NULL,
  category_ids TEXT NOT NULL,
  variant TEXT NOT NULL,
  duration_s INTEGER NOT NULL,
  score INTEGER NOT NULL,
  words TEXT NOT NULL,
  match_id INTEGER REFERENCES matches (id) ON DELETE CASCADE,
  team_index INTEGER
);

CREATE TABLE seen_words (
  word_id INTEGER PRIMARY KEY NOT NULL REFERENCES words (id) ON DELETE CASCADE,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX idx_categories_pack ON categories (pack_id);
CREATE INDEX idx_words_category ON words (category_id);
CREATE INDEX idx_rounds_played_at ON rounds (played_at);
CREATE INDEX idx_rounds_match ON rounds (match_id);
CREATE INDEX idx_seen_words_last_seen ON seen_words (last_seen_at);
`,
  },
];

export const latestVersion = migrations.reduce((max, m) => Math.max(max, m.version), 0);

/** Migrations à appliquer, dans l'ordre, pour passer de `currentVersion` à la dernière. */
export function pendingMigrations(currentVersion: number): Migration[] {
  return migrations.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);
}
