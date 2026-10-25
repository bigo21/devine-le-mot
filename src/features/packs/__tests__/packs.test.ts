import example from '../../../../docs/exemple-pack.json';
import { foldText } from '../filter';
import { normalizeWord, packFileSchema, packLimits } from '../schema';
import { builtinPackFiles } from '../seed';
import { builtinRuleViolations, needsUpdate, planWords } from '../seed-plan';

/** Petit paquet valide, modifiable par les tests. */
function validPack() {
  return {
    format: 'devine-pack',
    formatVersion: 1,
    pack: {
      id: 'mon-pack',
      name: { fr: 'Mon pack' },
      version: 1,
      categories: [
        {
          id: 'ma-categorie',
          name: { fr: 'Ma catégorie' },
          words: Array.from({ length: 10 }, (_, i) => `Mot ${i + 1}`),
        },
      ],
    },
  };
}

describe('schéma des paquets (zod, aligné sur pack.schema.json)', () => {
  it('accepte le paquet d’exemple de docs/', () => {
    expect(packFileSchema.safeParse(example).success).toBe(true);
  });

  it('accepte la forme courte (mot seul) et la forme complète', () => {
    const pack = validPack();
    pack.pack.categories[0]!.words[0] = {
      text: 'Ndolé',
      difficulty: 1,
      forbidden: ['a', 'b', 'c'],
    } as never;
    expect(packFileSchema.safeParse(pack).success).toBe(true);
  });

  it.each([
    ['un format inconnu', (p: ReturnType<typeof validPack>) => ({ ...p, format: 'autre' })],
    ['un champ en trop', (p: ReturnType<typeof validPack>) => ({ ...p, extra: true })],
    [
      'un id avec majuscules',
      (p: ReturnType<typeof validPack>) => ({ ...p, pack: { ...p.pack, id: 'Mon-Pack' } }),
    ],
    [
      'moins de 10 mots',
      (p: ReturnType<typeof validPack>) => ({
        ...p,
        pack: { ...p.pack, categories: [{ ...p.pack.categories[0]!, words: ['a', 'b'] }] },
      }),
    ],
    [
      'un mot de plus de 60 caractères',
      (p: ReturnType<typeof validPack>) => ({
        ...p,
        pack: {
          ...p.pack,
          categories: [
            { ...p.pack.categories[0]!, words: [...p.pack.categories[0]!.words, 'x'.repeat(61)] },
          ],
        },
      }),
    ],
    [
      'une couleur de catégorie verte (retirée de la palette)',
      (p: ReturnType<typeof validPack>) => ({
        ...p,
        pack: { ...p.pack, categories: [{ ...p.pack.categories[0]!, color: 'palm' }] },
      }),
    ],
  ])('refuse %s', (_label, mutate) => {
    expect(packFileSchema.safeParse(mutate(validPack())).success).toBe(false);
  });

  it('refuse un paquet de plus de 20 000 mots au total', () => {
    const category = (i: number) => ({
      id: `cat-${i}`,
      name: { fr: `Catégorie ${i}` },
      words: Array.from({ length: packLimits.maxWordsPerCategory }, (_, w) => `Mot ${w}`),
    });
    const pack = validPack();
    const big = { ...pack, pack: { ...pack.pack, categories: [1, 2, 3, 4, 5].map(category) } };
    expect(packFileSchema.safeParse(big).success).toBe(false);
  });

  it('normalise les deux formes de mot', () => {
    expect(normalizeWord('  Soya ')).toEqual({ text: 'Soya', forbidden: [] });
    expect(normalizeWord({ text: 'Koki', forbidden: ['haricot'] }).forbidden).toEqual(['haricot']);
  });
});

describe('paquets intégrés', () => {
  it.each(builtinPackFiles.map((file, i) => [i, file] as const))(
    'le paquet n°%i est valide et respecte les règles du contenu intégré',
    (_i, file) => {
      const parsed = packFileSchema.safeParse(file);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(builtinRuleViolations(parsed.data)).toEqual([]);
    },
  );

  it('aucun mot en double dans une catégorie (accents et majuscules ignorés)', () => {
    for (const file of builtinPackFiles) {
      for (const category of packFileSchema.parse(file).pack.categories) {
        const texts = category.words.map((entry) => foldText(normalizeWord(entry).text));
        const duplicates = texts.filter((text, i) => texts.indexOf(text) !== i);
        expect({ category: category.id, duplicates }).toEqual({
          category: category.id,
          duplicates: [],
        });
      }
    }
  });

  it('les identifiants de paquets sont uniques', () => {
    const ids = builtinPackFiles.map((file) => packFileSchema.parse(file).pack.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('détecte un mot intégré sans ses 3 mots interdits', () => {
    const pack = packFileSchema.parse({
      ...validPack(),
      pack: { ...validPack().pack, region: 'world' },
    });
    expect(builtinRuleViolations(pack).some((p) => p.includes('3 attendus'))).toBe(true);
  });
});

describe('mise à jour des paquets intégrés', () => {
  it('n’écrit un paquet que s’il est absent ou plus ancien', () => {
    expect(needsUpdate(null, 1)).toBe(true);
    expect(needsUpdate(1, 2)).toBe(true);
    expect(needsUpdate(2, 2)).toBe(false);
    expect(needsUpdate(3, 2)).toBe(false);
  });

  it('insère les nouveaux mots, met à jour les existants, supprime les retirés', () => {
    const plan = planWords(
      ['Lion', 'Zèbre', 'Dodo'],
      [
        { text: 'Lion', forbidden: ['a', 'b', 'c'] },
        { text: 'Zèbre', forbidden: [] },
        { text: 'Okapi', forbidden: [] },
      ],
    );
    expect(plan.insert.map((w) => w.text)).toEqual(['Okapi']);
    expect(plan.update.map((w) => w.text)).toEqual(['Lion', 'Zèbre']);
    expect(plan.remove).toEqual(['Dodo']);
  });

  it('ignore les doublons du paquet', () => {
    const plan = planWords(
      [],
      [
        { text: 'Lion', forbidden: [] },
        { text: 'Lion', forbidden: [] },
      ],
    );
    expect(plan.insert).toHaveLength(1);
  });
});
