import { type AccentColor, accentColors, categoryColors, colors, onColor } from '../tokens';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const accents: AccentColor[] = [...accentColors, 'pass', 'danger'];

describe('contrastes (DESIGN.md §2 et §7)', () => {
  it.each(accents)('le texte sur %s atteint 4,5:1', (accent) => {
    expect(contrast(colors[accent], onColor(accent))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['bg', 'bgElevated', 'bgSunken'] as const)(
    'text et textMuted sur %s atteignent 4,5:1',
    (bg) => {
      expect(contrast(colors.text, colors[bg])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.textMuted, colors[bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('la pilule sélectionnée (bg sur text) atteint 4,5:1', () => {
    expect(contrast(colors.bg, colors.text)).toBeGreaterThanOrEqual(4.5);
  });
});

function hue(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
}

describe('couleurs de catégorie (fond de partie)', () => {
  it.each(categoryColors)('%s reste loin des flashs trouvé (vert) et passer (orange)', (color) => {
    expect(hueDistance(colors[color], colors.palm)).toBeGreaterThanOrEqual(45);
    expect(hueDistance(colors[color], colors.pass)).toBeGreaterThanOrEqual(45);
  });

  it('le mot en jeu reste lisible sur chaque couleur de catégorie (≥ 4,5:1)', () => {
    for (const color of categoryColors) {
      expect(contrast(colors[color], onColor(color))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
