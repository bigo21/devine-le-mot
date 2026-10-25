import { filterCategories, foldText } from '../filter';
import type { CategorySummary } from '../repository';

const category = (overrides: Partial<CategorySummary>): CategorySummary => ({
  id: 1,
  name: 'Catégorie',
  emoji: null,
  color: 'lagoon',
  region: 'world',
  source: 'builtin',
  wordCount: 20,
  favorite: false,
  variants: null,
  forbiddenEligible: 0,
  tags: [],
  ...overrides,
});

const list = [
  category({ id: 1, name: 'Plats camerounais', region: 'cm', tags: ['cuisine'], favorite: true }),
  category({ id: 2, name: 'Animaux', region: 'world' }),
  category({ id: 3, name: 'Situations gênantes', region: 'party' }),
  category({ id: 4, name: 'Mes blagues', region: 'custom', source: 'user' }),
  category({ id: 5, name: 'Paquet reçu', region: 'cm', source: 'imported' }),
];

const ids = (result: CategorySummary[]) => result.map((c) => c.id);

describe('filtres de l’écran Catégories', () => {
  it('« Toutes » garde tout, dans l’ordre (favoris en tête)', () => {
    expect(ids(filterCategories(list, 'all', ''))).toEqual([1, 2, 3, 4, 5]);
  });

  it('une région garde ses catégories, intégrées ou importées', () => {
    expect(ids(filterCategories(list, 'cm', ''))).toEqual([1, 5]);
    expect(ids(filterCategories(list, 'party', ''))).toEqual([3]);
  });

  it('« Mes catégories » garde les catégories créées et importées', () => {
    expect(ids(filterCategories(list, 'mine', ''))).toEqual([4, 5]);
  });

  it('la recherche ignore accents et majuscules', () => {
    expect(ids(filterCategories(list, 'all', 'GENANTES'))).toEqual([3]);
    expect(ids(filterCategories(list, 'all', '  animaux '))).toEqual([2]);
  });

  it('la recherche porte aussi sur les étiquettes', () => {
    expect(ids(filterCategories(list, 'all', 'cuisine'))).toEqual([1]);
  });

  it('combine pilule et recherche', () => {
    expect(ids(filterCategories(list, 'cm', 'recu'))).toEqual([5]);
    expect(filterCategories(list, 'party', 'animaux')).toEqual([]);
  });

  it('foldText retire les accents', () => {
    expect(foldText('Ndolé Éléphant')).toBe('ndole elephant');
  });
});
