import type { PlayedCard } from '../engine';
import { heldUpright, lowerSensitivity, quickPasses, suggestLowerSensitivity } from '../hints';

const played = (entries: [result: 'found' | 'passed', at: number][]): PlayedCard[] =>
  entries.map(([result, at], i) => ({ card: { id: i, text: `Mot ${i}` }, result, at }));

describe('détection trop sensible', () => {
  const jumpy = played([
    ['found', 5000],
    ['passed', 5600],
    ['passed', 6300],
    ['passed', 7100],
    ['found', 15000],
  ]);

  it('compte les mots passés moins de 1,2 s après le précédent', () => {
    expect(quickPasses(jumpy)).toEqual({ quick: 3, passes: 3 });
  });

  it('propose de baisser la sensibilité après plusieurs passages éclair', () => {
    expect(suggestLowerSensitivity(jumpy, { tapMode: false, sensitivity: 'normal' })).toBe(true);
  });

  it('pas de proposition en mode tap ni si la sensibilité est déjà faible', () => {
    expect(suggestLowerSensitivity(jumpy, { tapMode: true, sensitivity: 'normal' })).toBe(false);
    expect(suggestLowerSensitivity(jumpy, { tapMode: false, sensitivity: 'low' })).toBe(false);
  });

  it('des mots passés en prenant son temps ne déclenchent rien', () => {
    const calm = played([
      ['passed', 5000],
      ['passed', 9000],
      ['passed', 14000],
      ['passed', 15000],
    ]);
    expect(suggestLowerSensitivity(calm, { tapMode: false, sensitivity: 'high' })).toBe(false);
  });

  it('baisse d’un cran : forte → normale → faible', () => {
    expect(lowerSensitivity('high')).toBe('normal');
    expect(lowerSensitivity('normal')).toBe('low');
    expect(lowerSensitivity('low')).toBeNull();
  });
});

describe('téléphone tenu debout', () => {
  it('debout (gravité le long de Y) au lieu de couché (gravité le long de X)', () => {
    expect(heldUpright({ x: 0.5, y: 9.6, z: 1 })).toBe(true);
    expect(heldUpright({ x: -0.8, y: -9.4, z: 2 })).toBe(true);
    expect(heldUpright({ x: 9.7, y: 0.6, z: 1 })).toBe(false);
  });

  it('à plat ou penché vers le sol : rien à signaler', () => {
    expect(heldUpright({ x: 0.2, y: 0.3, z: 9.8 })).toBe(false);
    expect(heldUpright({ x: 6, y: 6.2, z: 3 })).toBe(false);
  });
});
