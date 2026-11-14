import { gridColumns, gridItemWidth } from '../grid';

describe('grille de cartes', () => {
  it('2 colonnes sur téléphone, 3 puis 4 sur tablette', () => {
    expect(gridColumns(360)).toBe(2);
    expect(gridColumns(599)).toBe(2);
    expect(gridColumns(600)).toBe(3);
    expect(gridColumns(839)).toBe(3);
    expect(gridColumns(840)).toBe(4);
  });

  it('les cartes et les espaces tiennent dans la largeur', () => {
    for (const [available, columns] of [
      [344, 2],
      [700, 3],
      [1000, 4],
    ] as const) {
      const width = gridItemWidth(available, columns, 12);
      expect(width * columns + 12 * (columns - 1)).toBeLessThanOrEqual(available);
      expect(width).toBeGreaterThan(0);
    }
  });
});
