import {
  addWords,
  cleanForbidden,
  draftStatus,
  draftToPackFile,
  emptyDraft,
  exportFileName,
  newPackId,
  parseWordList,
  slugify,
} from '../editor';
import {
  conflictPlan,
  copyOf,
  looksLikeJson,
  parsePackText,
  summarizePack,
} from '../import';
import { packFileSchema, packLimits } from '../schema';

const words = (n: number) => Array.from({ length: n }, (_, i) => `Mot ${i + 1}`);

const draftWith = (count: number, forbidden: string[] = []) => ({
  ...emptyDraft('🍲', 'plum' as const),
  name: 'Mes plats',
  words: words(count).map((text) => ({ text, forbidden })),
});

describe('liste collée', () => {
  it('une ligne = un mot, sans lignes vides ni puces', () => {
    expect(parseWordList('Ndolé\n\n - Eru\n• Koki\n2) Mbongo\n3. Okok').words).toEqual([
      'Ndolé',
      'Eru',
      'Koki',
      'Mbongo',
      'Okok',
    ]);
  });

  it('retire les doublons, accents et majuscules ignorés, y compris avec les mots existants', () => {
    const parsed = parseWordList('Ndolé\nndole\nEru\nKoki', ['koki']);
    expect(parsed.words).toEqual(['Ndolé', 'Eru']);
    expect(parsed.duplicates).toBe(2);
  });

  it('ignore les mots de plus de 60 caractères et les signale', () => {
    const long = 'x'.repeat(61);
    const parsed = parseWordList(`Eru\n${long}`);
    expect(parsed.words).toEqual(['Eru']);
    expect(parsed.tooLong).toEqual([long]);
  });

  it('réduit les espaces intérieurs', () => {
    expect(parseWordList('  Poulet    DG  ').words).toEqual(['Poulet DG']);
  });

  it('ajoute à la fin de la liste existante', () => {
    const { words: next, result } = addWords([{ text: 'Eru', forbidden: [] }], 'Koki\neru');
    expect(next.map((w) => w.text)).toEqual(['Eru', 'Koki']);
    expect(result.duplicates).toBe(1);
  });
});

describe('mots interdits saisis', () => {
  it('nettoie, déduplique, retire le mot lui-même et garde 5 au plus', () => {
    expect(
      cleanForbidden('Ndolé', [' feuilles ', 'Feuilles', 'ndole', '', 'arachide', 'a', 'b', 'c', 'd']),
    ).toEqual(['feuilles', 'arachide', 'a', 'b', 'c']);
  });
});

describe('état du brouillon', () => {
  it('moins de 10 mots : impossible d’enregistrer', () => {
    const status = draftStatus(draftWith(9));
    expect(status.tooFewWords).toBe(true);
    expect(status.canSave).toBe(false);
  });

  it('entre 10 et 29 mots : enregistrable avec avertissement', () => {
    const status = draftStatus(draftWith(12));
    expect(status).toMatchObject({ canSave: true, fewWords: true, tooFewWords: false });
  });

  it('nom vide : impossible d’enregistrer', () => {
    expect(draftStatus({ ...draftWith(40), name: '   ' }).canSave).toBe(false);
  });

  it('compte les mots éligibles aux mots interdits (3 au moins) et le seuil de 20', () => {
    expect(draftStatus(draftWith(25, ['a', 'b'])).forbiddenEligible).toBe(0);
    expect(draftStatus(draftWith(25, ['a', 'b', '  '])).forbiddenEligible).toBe(0);
    const status = draftStatus(draftWith(25, ['a', 'b', 'c']));
    expect(status.forbiddenEligible).toBe(25);
    expect(status.forbiddenVariant).toBe(true);
    expect(draftStatus(draftWith(19, ['a', 'b', 'c'])).forbiddenVariant).toBe(false);
  });
});

describe('identifiants et noms de fichiers', () => {
  it('slugify : ASCII en kebab-case, avec repli si trop court', () => {
    expect(slugify('Plats & boissons du Cameroun !')).toBe('plats-boissons-du-cameroun');
    expect(slugify('🎉')).toBe('categorie');
  });

  it('identifiant de paquet valide pour le schéma', () => {
    const id = newPackId('Mes plats préférés', () => 0.5);
    expect(id).toMatch(/^perso-mes-plats-preferes-[a-z0-9]{6}$/);
    expect(id.length).toBeLessThanOrEqual(64);
  });

  it('nom de fichier exporté', () => {
    expect(exportFileName('Soirée chez Paul')).toBe('soiree-chez-paul.devine.json');
  });
});

describe('brouillon → paquet', () => {
  it('produit un paquet valide pour le schéma', () => {
    const draft = { ...draftWith(12), description: '  Pour la famille  ' };
    draft.words[0] = { text: 'Ndolé', forbidden: ['feuilles', 'arachide', 'ndolé', 'crevettes'] };
    const file = draftToPackFile(draft, 'perso-mes-plats-abc123', 1);
    expect(packFileSchema.safeParse(file).success).toBe(true);
    const category = file.pack.categories[0]!;
    expect(category.words[0]).toEqual({
      text: 'Ndolé',
      forbidden: ['feuilles', 'arachide', 'crevettes'],
    });
    expect(category.words[1]).toBe('Mot 2');
    expect(file.pack.description).toEqual({ fr: 'Pour la famille' });
    expect(file.pack.region).toBe('custom');
  });
});

describe('duplication d’une catégorie du jeu', () => {
  it('garde les variantes et les étiquettes (Imitation des personnalités)', () => {
    const draft = {
      ...draftWith(12),
      variants: ['classic', 'imitation', 'mix'] as ('classic' | 'imitation' | 'mix')[],
      tags: ['personnalites'],
    };
    const category = draftToPackFile(draft, 'perso-copie-abc123', 1).pack.categories[0]!;
    expect(category.variants).toEqual(['classic', 'imitation', 'mix']);
    expect(category.tags).toEqual(['personnalites']);
  });

  it('sans variantes déclarées, le champ reste absent (variantes par défaut)', () => {
    const category = draftToPackFile(draftWith(12), 'perso-x-abc123', 1).pack.categories[0]!;
    expect(category.variants).toBeUndefined();
  });
});

describe('lecture d’un fichier importé', () => {
  const valid = () => draftToPackFile(draftWith(12), 'perso-test-abc123', 1);

  it('accepte un paquet valide', () => {
    const result = parsePackText(JSON.stringify(valid()));
    expect(result.ok).toBe(true);
  });

  it('refuse un fichier trop lourd sans le lire', () => {
    const result = parsePackText('{}', packLimits.maxFileBytes + 1);
    expect(result).toEqual({ ok: false, error: { code: 'tooLarge' } });
  });

  it('distingue fichier vide, texte non JSON et JSON qui n’est pas un paquet', () => {
    expect(parsePackText('  ')).toEqual({ ok: false, error: { code: 'empty' } });
    expect(parsePackText('Ndolé\nEru')).toEqual({ ok: false, error: { code: 'notJson' } });
    expect(parsePackText('{"name":"x"}')).toEqual({ ok: false, error: { code: 'notAPack' } });
    expect(parsePackText(JSON.stringify({ ...valid(), formatVersion: 2 }))).toEqual({
      ok: false,
      error: { code: 'unsupportedVersion' },
    });
  });

  it('explique où est le problème : catégorie et mot', () => {
    const file = valid();
    const category = file.pack.categories[0]!;
    category.words[4] = 'x'.repeat(61);
    const result = parsePackText(JSON.stringify(file));
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.code === 'invalid') {
      expect(result.error.issues).toContainEqual({ kind: 'wordTooLong', category: 1, word: 5 });
    }
  });

  it('signale une catégorie de moins de 10 mots', () => {
    const file = valid();
    file.pack.categories[0]!.words = words(5);
    const result = parsePackText(JSON.stringify(file));
    expect(!result.ok && result.error.code === 'invalid' && result.error.issues).toEqual([
      { kind: 'tooFewWords', category: 1, word: undefined },
    ]);
  });

  it('résume le paquet pour l’aperçu', () => {
    expect(summarizePack(valid())).toMatchObject({
      name: 'Mes plats',
      words: 12,
      categories: [{ name: 'Mes plats', words: 12 }],
    });
  });

  it('reconnaît un texte JSON d’une liste de mots', () => {
    expect(looksLikeJson('  {"format": "devine-pack"}')).toBe(true);
    expect(looksLikeJson('Ndolé\nEru')).toBe(false);
  });
});

describe('conflits d’identifiant', () => {
  it('intégré : copie automatique ; utilisateur ou importé : on demande', () => {
    expect(conflictPlan(null)).toBe('insert');
    expect(conflictPlan('builtin')).toBe('copy');
    expect(conflictPlan('user')).toBe('ask');
    expect(conflictPlan('imported')).toBe('ask');
  });

  it('copie : nouvel id libre et nom suffixé', () => {
    const file = draftToPackFile(draftWith(12), 'cm-artistes', 1);
    const copy = copyOf(file, new Set(['cm-artistes', 'cm-artistes-copie']), '(copie)', () => 0.5);
    expect(copy.pack.id).toMatch(/^cm-artistes-copie-[a-z0-9]+$/);
    expect(copy.pack.name.fr).toBe('Mes plats (copie)');
    expect(copy.pack.categories[0]!.name.fr).toBe('Mes plats (copie)');
    expect(packFileSchema.safeParse(copy).success).toBe(true);
  });
});
