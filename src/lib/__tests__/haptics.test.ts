import { androidPatterns, pickHaptic } from '../haptics';

describe('pickHaptic (un seul retour par geste)', () => {
  it('le retour de jeu l’emporte sur le tap du bouton qui l’a déclenché', () => {
    expect(pickHaptic(['tap', 'warning'])).toBe('warning');
    expect(pickHaptic(['warning', 'tap'])).toBe('warning');
  });

  it('sans retour de jeu, garde le dernier retour d’interface', () => {
    expect(pickHaptic(['tap'])).toBe('tap');
    expect(pickHaptic(['tap', 'select'])).toBe('select');
  });

  it('garde le dernier retour de jeu demandé', () => {
    expect(pickHaptic(['success', 'heavy'])).toBe('heavy');
  });

  it('ne joue rien si rien n’est demandé', () => {
    expect(pickHaptic([])).toBeUndefined();
  });
});

const total = (pattern: number[]) => pattern.reduce((sum, ms) => sum + ms, 0);
const pulses = (pattern: number[]) => pattern.filter((_, i) => i % 2 === 1);

describe('rythmes de vibration Android', () => {
  it('trouvé et passer se distinguent au rythme (nombre ou durée des impulsions)', () => {
    const found = pulses(androidPatterns.success);
    const pass = pulses(androidPatterns.warning);
    expect(found.length).not.toBe(pass.length);
    expect(Math.max(...pass)).toBeGreaterThan(Math.max(...found));
  });

  it('chaque retour de jeu a un rythme unique', () => {
    const signatures = Object.values(androidPatterns).map((p) => p.join(','));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('la fin de manche est la plus longue, le tic le plus court', () => {
    const durations = Object.values(androidPatterns).map(total);
    expect(total(androidPatterns.heavy)).toBe(Math.max(...durations));
    expect(total(androidPatterns.light)).toBe(Math.min(...durations));
  });

  it('aucun retour ne dure plus de 600 ms (rien ne bloque, MOTION.md §1)', () => {
    for (const pattern of Object.values(androidPatterns)) {
      expect(total(pattern)).toBeLessThanOrEqual(600);
    }
  });
});
