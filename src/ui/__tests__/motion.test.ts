import { motion, staggerDelay } from '../motion/constants';
import { project, rubberband } from '../motion/physics';
import { NDOP_TILE, ndopPath } from '../patterns/ndop';

describe('staggerDelay', () => {
  it('décale chaque élément de la cascade', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2, 100)).toBe(100 + 2 * motion.stagger);
  });

  it('laisse apparaître directement au-delà du plafond', () => {
    expect(staggerDelay(motion.maxStaggered)).toBeUndefined();
  });

  it('reste dans la fourchette de MOTION.md (30–40 ms)', () => {
    expect(motion.stagger).toBeGreaterThanOrEqual(30);
    expect(motion.stagger).toBeLessThanOrEqual(40);
  });
});

describe('physique des gestes', () => {
  it('project : un geste rapide porte plus loin, dans le même sens', () => {
    expect(project(0)).toBe(0);
    expect(project(2000)).toBeGreaterThan(project(500));
    expect(project(-1000)).toBeLessThan(0);
  });

  it('rubberband : résiste sans jamais dépasser le déplacement réel', () => {
    const resisted = rubberband(200, 400);
    expect(resisted).toBeGreaterThan(0);
    expect(resisted).toBeLessThan(200);
    expect(rubberband(-200, 400)).toBeCloseTo(-resisted);
  });
});

describe('ndopPath', () => {
  it('couvre toute la largeur demandée avec un chemin SVG valide', () => {
    const path = ndopPath(360, 800);
    expect(path.startsWith('M')).toBe(true);
    expect(path).not.toMatch(/NaN|undefined|Infinity/);
    // Les bandes horizontales vont d'un bord à l'autre.
    expect(path).toContain('L360 ');
  });

  it('grandit avec la surface', () => {
    expect(ndopPath(NDOP_TILE * 10, NDOP_TILE * 10).length).toBeGreaterThan(
      ndopPath(NDOP_TILE * 2, NDOP_TILE * 2).length,
    );
  });

  it('reste valide pour une surface nulle', () => {
    expect(ndopPath(0, 0)).not.toMatch(/NaN|undefined|Infinity/);
  });
});
