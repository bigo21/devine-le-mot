import { latestVersion, migrations, pendingMigrations } from '../migrations';

describe('migrations', () => {
  it('ont des versions uniques, croissantes et sans trou à partir de 1', () => {
    expect(migrations.map((m) => m.version)).toEqual(migrations.map((_, i) => i + 1));
  });

  it('pendingMigrations renvoie seulement les versions manquantes, dans l’ordre', () => {
    expect(pendingMigrations(0).map((m) => m.version)).toEqual(migrations.map((m) => m.version));
    expect(pendingMigrations(latestVersion)).toEqual([]);
  });

  it('la v1 crée toutes les tables du modèle', () => {
    const sql = migrations[0]?.sql ?? '';
    for (const table of ['packs', 'categories', 'words', 'matches', 'rounds', 'seen_words']) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE ${table} \\(`));
    }
  });

  it('la table words ne stocke pas de liste de variantes', () => {
    const words = /CREATE TABLE words \(([\s\S]*?)\);/.exec(migrations[0]?.sql ?? '')?.[1] ?? '';
    expect(words).not.toMatch(/variant/);
  });
});
