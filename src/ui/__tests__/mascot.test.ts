import { mascotStates, mouthControls, nextBlinkDelay, poses } from '../mascot/poses';

describe('mascotte : poses', () => {
  it('chaque état de MOTION.md §3 a une pose', () => {
    expect([...mascotStates].sort()).toEqual(Object.keys(poses).sort());
    expect(mascotStates).toHaveLength(6);
  });

  it('sourit quand elle célèbre, fait la moue sur un mauvais score', () => {
    expect(poses.celebrate.mouthCurve).toBeGreaterThan(0);
    expect(poses.pout.mouthCurve).toBeLessThan(0);
  });

  it('la moue reste bienveillante : yeux ouverts, pas de bouche ouverte', () => {
    expect(poses.pout.eyeOpen).toBeGreaterThan(0.5);
    expect(poses.pout.mouthOpen).toBe(0);
  });

  it('les poses restent dans le dessin (regard et inclinaison bornés)', () => {
    for (const pose of Object.values(poses)) {
      expect(Math.abs(pose.lookX)).toBeLessThanOrEqual(5);
      expect(Math.abs(pose.lookY)).toBeLessThanOrEqual(5);
      expect(Math.abs(pose.tilt)).toBeLessThanOrEqual(10);
    }
  });
});

describe('mascotte : bouche', () => {
  it('sourire : courbe vers le bas ; moue : courbe vers le haut', () => {
    expect(mouthControls({ mouthCurve: 1, mouthOpen: 0 }).top).toBeGreaterThan(60);
    expect(mouthControls({ mouthCurve: -1, mouthOpen: 0 }).top).toBeLessThan(60);
  });

  it('bouche fermée = une ligne ; ouverte = une forme qui a de l’épaisseur', () => {
    const closed = mouthControls({ mouthCurve: 0.5, mouthOpen: 0 });
    expect(closed.bottom).toBe(closed.top);
    const open = mouthControls({ mouthCurve: 0.5, mouthOpen: 0.7 });
    expect(open.bottom).toBeGreaterThan(open.top);
  });
});

describe('mascotte : clignement', () => {
  it('entre 3 et 6 s, même avec un tirage hors bornes', () => {
    expect(nextBlinkDelay(0)).toBe(3000);
    expect(nextBlinkDelay(1)).toBe(6000);
    expect(nextBlinkDelay(-2)).toBe(3000);
    expect(nextBlinkDelay(5)).toBe(6000);
  });
});
