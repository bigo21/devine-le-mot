import { seededRandom } from '../engine';
import {
  availableVariants,
  cardsForVariant,
  declaredVariants,
  MIN_FORBIDDEN_WORDS,
  pickVariant,
  tooFewWordsFor,
  variantForCard,
  variantOrder,
} from '../variants';

const card = (id: number, forbidden: string[] = []) => ({ id, text: `Mot ${id}`, forbidden });

describe('variantes déclarées par une catégorie', () => {
  it('sans liste : toutes sauf Imitation', () => {
    expect(declaredVariants(null)).toEqual(variantOrder.filter((id) => id !== 'imitation'));
  });

  it('avec liste : uniquement la liste, dans l’ordre du carrousel', () => {
    expect(declaredVariants(['mix', 'imitation', 'classic'])).toEqual([
      'classic',
      'imitation',
      'mix',
    ]);
  });
});

describe('variantes proposées pour une sélection', () => {
  const plain = { variants: null, forbiddenEligible: 0 };
  const people = {
    variants: ['classic', 'mime', 'forbidden', 'imitation', 'mix'] as const,
    forbiddenEligible: 25,
  };

  it('Mots interdits demande 20 mots éligibles au total', () => {
    expect(availableVariants([plain])).not.toContain('forbidden');
    expect(availableVariants([{ variants: null, forbiddenEligible: 20 }])).toContain('forbidden');
    expect(
      availableVariants([
        { variants: null, forbiddenEligible: 12 },
        { variants: null, forbiddenEligible: MIN_FORBIDDEN_WORDS - 12 },
      ]),
    ).toContain('forbidden');
  });

  it('Imitation seulement si toutes les catégories choisies la déclarent', () => {
    expect(availableVariants([people])).toContain('imitation');
    expect(availableVariants([people, plain])).not.toContain('imitation');
  });

  it('une variante doit convenir à toutes les catégories (intersection)', () => {
    expect(availableVariants([people, plain])).toEqual(['classic', 'mime', 'forbidden', 'mix']);
  });

  it('Mix en dernier, seulement avec au moins deux autres variantes', () => {
    expect(availableVariants([plain]).at(-1)).toBe('mix');
    expect(availableVariants([{ variants: ['classic', 'mix'], forbiddenEligible: 0 }])).toEqual([
      'classic',
    ]);
  });

  it('jamais vide : Classique en repli', () => {
    expect(availableVariants([{ variants: ['forbidden'], forbiddenEligible: 0 }])).toEqual([
      'classic',
    ]);
    // Sans sélection : variantes par défaut (sans Mots interdits ni Imitation).
    expect(availableVariants([])).toEqual(
      variantOrder.filter((id) => id !== 'imitation' && id !== 'forbidden'),
    );
  });

  it('garde la dernière variante jouée si elle est encore proposée', () => {
    expect(pickVariant('sing', ['classic', 'sing'])).toBe('sing');
    expect(pickVariant('imitation', ['classic', 'sing'])).toBe('classic');
  });
});

describe('cartes et tirage', () => {
  it('Mots interdits ne garde que les mots ayant 3 mots interdits', () => {
    const cards = [card(1, ['a', 'b', 'c']), card(2, ['a']), card(3)];
    expect(cardsForVariant(cards, 'forbidden').map((c) => c.id)).toEqual([1]);
    expect(cardsForVariant(cards, 'classic')).toHaveLength(3);
  });

  it('hors Mix, la carte prend la variante de la manche', () => {
    const v = variantForCard('sing', card(1), {
      available: ['classic', 'sing'],
      declared: ['classic', 'sing'],
      random: seededRandom(1),
    });
    expect(v).toBe('sing');
  });

  it('en Mix : jamais Mots interdits sans mots interdits, jamais Imitation non déclarée', () => {
    const random = seededRandom(42);
    const available = ['classic', 'forbidden', 'imitation', 'mix'] as const;
    for (let i = 0; i < 200; i++) {
      const v = variantForCard('mix', card(i), {
        available,
        declared: ['classic', 'forbidden', 'mix'],
        random,
      });
      expect(v).toBe('classic');
    }
  });

  it('en Mix : évite deux fois de suite la même variante quand c’est possible', () => {
    const random = seededRandom(7);
    let previous: ReturnType<typeof variantForCard> | null = null;
    for (let i = 0; i < 100; i++) {
      const v = variantForCard('mix', card(i, ['a', 'b', 'c']), {
        available: ['classic', 'mime', 'sing', 'mix'],
        declared: declaredVariants(null),
        previous,
        random,
      });
      expect(v).not.toBe(previous);
      expect(v).not.toBe('mix');
      previous = v;
    }
  });

  it('catégorie trop petite pour la durée : environ un mot toutes les 3 s', () => {
    expect(tooFewWordsFor(19, 60)).toBe(true);
    expect(tooFewWordsFor(20, 60)).toBe(false);
    expect(tooFewWordsFor(39, 120)).toBe(true);
  });
});
