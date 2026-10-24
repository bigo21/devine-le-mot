import { resolveLanguage } from '../index';
import { en } from '../locales/en';
import { fr } from '../locales/fr';

function keyPaths(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keyPaths(value as object, `${prefix}${key}.`),
  );
}

describe('resolveLanguage', () => {
  it('respecte une préférence explicite', () => {
    expect(resolveLanguage('en', ['fr'])).toBe('en');
    expect(resolveLanguage('fr', ['en'])).toBe('fr');
  });

  it('suit la première langue gérée du téléphone', () => {
    expect(resolveLanguage('system', ['de', 'en', 'fr'])).toBe('en');
  });

  it('retombe sur le français sinon', () => {
    expect(resolveLanguage('system', ['de', null])).toBe('fr');
    expect(resolveLanguage('system', [])).toBe('fr');
  });
});

describe('traductions', () => {
  it('FR et EN ont exactement les mêmes clés', () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(fr).sort());
  });

  it("aucune chaîne n'est vide", () => {
    for (const locale of [fr, en]) {
      const empty = keyPaths(locale).filter(
        (path) =>
          path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], locale) ===
          '',
      );
      expect(empty).toEqual([]);
    }
  });
});
