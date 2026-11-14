import { CHAR_RATIO, wordFontSize } from '../word-fit';

describe('wordFontSize', () => {
  it('garde la taille de base pour un mot court', () => {
    expect(wordFontSize('Chat', 700, { base: 120, font: 'expressive' }).fontSize).toBe(120);
  });

  it('réduit pour que le mot le plus long tienne sur une ligne', () => {
    const { fontSize } = wordFontSize('Jambon-beurre', 700, { base: 120, font: 'expressive' });
    expect(fontSize * 13 * CHAR_RATIO.expressive).toBeLessThanOrEqual(700);
    expect(fontSize).toBeLessThan(120);
  });

  it('se base sur le mot le plus long, pas sur toute la phrase', () => {
    const one = wordFontSize('Ndolé', 700, { base: 120, font: 'expressive' });
    const phrase = wordFontSize('Poulet DG Ndolé', 700, { base: 120, font: 'expressive' });
    expect(phrase.fontSize).toBe(one.fontSize);
  });

  it('la police lisible, plus étroite, reste plus grande', () => {
    const a = wordFontSize('Anticonstitutionnel', 700, { base: 120, font: 'expressive' });
    const b = wordFontSize('Anticonstitutionnel', 700, { base: 120, font: 'readable' });
    expect(b.fontSize).toBeGreaterThan(a.fontSize);
  });

  it('respecte la base compacte et un plancher', () => {
    expect(wordFontSize('Ok', 700, { base: 80, font: 'readable' }).fontSize).toBe(80);
    expect(wordFontSize('x'.repeat(60), 300, { base: 120, font: 'expressive' }).fontSize).toBe(28);
  });

  it('interligne proportionnel, et texte vide ou largeur inconnue sans erreur', () => {
    expect(wordFontSize('Chat', 700, { base: 120, font: 'expressive' }).lineHeight).toBe(132);
    expect(wordFontSize('', 700, { base: 120, font: 'expressive' }).fontSize).toBe(120);
    expect(wordFontSize('Chat', 0, { base: 120, font: 'expressive' }).fontSize).toBe(120);
  });
});
