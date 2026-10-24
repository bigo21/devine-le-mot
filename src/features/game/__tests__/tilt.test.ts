import {
  calibrationProgress,
  type Gravity,
  initialTiltState,
  recalibrate,
  screenPitch,
  stepTilt,
  type TiltConfig,
  tiltConfigs,
  type TiltEvent,
  type TiltState,
  upSignFor,
} from '../tilt';

const normal = tiltConfigs.normal;
const STEP = 50; // DeviceMotion ~ toutes les 50 ms

/** Rejoue une suite d'angles à intervalle régulier ; renvoie l'état final et les événements. */
function run(angles: number[], config: TiltConfig = normal, start = initialTiltState(), t0 = 0) {
  let state: TiltState = start;
  const events: TiltEvent[] = [];
  angles.forEach((angle, i) => {
    const result = stepTilt(state, angle, t0 + i * STEP, config);
    state = result.state;
    events.push(...result.events);
  });
  return { state, events, end: t0 + angles.length * STEP };
}

const hold = (angle: number, ms: number) =>
  Array.from({ length: Math.ceil(ms / STEP) }, () => angle);
const ramp = (from: number, to: number, steps: number) =>
  Array.from({ length: steps }, (_, i) => from + ((to - from) * (i + 1)) / steps);

/** Téléphone posé sur le front, légèrement penché (12°), calibré. */
function calibrated(config: TiltConfig = normal) {
  const result = run(hold(12, 1000), config);
  expect(result.events).toEqual([{ type: 'calibrated', reference: 12 }]);
  return result;
}

const types = (events: TiltEvent[]) => events.map((e) => e.type);

describe('calibration', () => {
  it('fixe la référence après ~0,8 s de stabilité (le front n’est jamais vertical)', () => {
    const { state } = calibrated();
    expect(state.phase).toBe('armed');
    expect(state.reference).toBeCloseTo(12);
  });

  it('ne calibre pas tant que le téléphone bouge', () => {
    const shaking = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 0 : 25));
    const { state, events } = run(shaking);
    expect(events).toEqual([]);
    expect(state.phase).toBe('calibrating');
  });

  it('tolère un léger tremblement pendant la calibration', () => {
    const trembling = Array.from({ length: 20 }, (_, i) => 10 + (i % 2 === 0 ? 2 : -2));
    expect(types(run(trembling).events)).toEqual(['calibrated']);
  });

  it('la jauge avance pendant la stabilité et redémarre si ça bouge', () => {
    let { state } = run(hold(12, 400));
    expect(calibrationProgress(state, 400, normal)).toBeGreaterThan(0.3);
    state = stepTilt(state, 60, 450, normal).state;
    expect(calibrationProgress(state, 450, normal)).toBe(0);
  });

  it('recalibrate repart de zéro', () => {
    const { state } = calibrated();
    const again = recalibrate(state);
    expect(again.phase).toBe('calibrating');
    expect(again.reference).toBeNull();
  });
});

describe('gestes', () => {
  it('incliner vers le bas (écran vers le sol) = trouvé', () => {
    const { state, end } = calibrated();
    const { events } = run([...ramp(12, 70, 6), ...hold(70, 300)], normal, state, end);
    expect(types(events)).toEqual(['correct']);
  });

  it('incliner vers le haut (écran vers le plafond) = passer', () => {
    const { state, end } = calibrated();
    const { events } = run([...ramp(12, -45, 6), ...hold(-45, 300)], normal, state, end);
    expect(types(events)).toEqual(['pass']);
  });

  it('rester incliné ne déclenche qu’une fois : il faut revenir au neutre', () => {
    const { state, end } = calibrated();
    const { events } = run(hold(70, 3000), normal, state, end);
    expect(types(events)).toEqual(['correct']);
  });

  it('deux gestes séparés par un retour au neutre = deux événements', () => {
    const { state, end } = calibrated();
    const sequence = [...hold(70, 400), ...hold(12, 500), ...hold(-40, 400), ...hold(12, 300)];
    expect(types(run(sequence, normal, state, end).events)).toEqual(['correct', 'pass']);
  });

  it('hystérésis : entre le réarmement (20°) et le seuil (40°), pas de réarmement', () => {
    const { state, end } = calibrated();
    // Déclenche, redescend à 30° d'écart (zone morte), remonte : pas de 2e geste.
    const sequence = [...hold(70, 400), ...hold(42, 600), ...hold(70, 400)];
    expect(types(run(sequence, normal, state, end).events)).toEqual(['correct']);
  });
});

describe('robustesse', () => {
  it('ignore les tremblements autour de la position neutre', () => {
    const { state, end } = calibrated();
    const tremor = Array.from({ length: 60 }, (_, i) => 12 + Math.sin(i) * 12);
    expect(run(tremor, normal, state, end).events).toEqual([]);
  });

  it('ignore un pic isolé (lissage sur 4 mesures)', () => {
    const { state, end } = calibrated();
    expect(run([12, 12, 75, 12, 12, 12], normal, state, end).events).toEqual([]);
  });

  it('anti-rebond : un aller-retour trop rapide ne compte qu’une fois', () => {
    const { state, end } = calibrated();
    // Bas, neutre et de nouveau bas en moins de 400 ms.
    const quick = [70, 70, 70, 70, 12, 12, 12, 12, 70, 70];
    const { events } = run(quick, normal, state, end);
    expect(types(events)).toEqual(['correct']);
  });

  it('un geste franc reste détecté même rapide (≈ 300 ms)', () => {
    const { state, end } = calibrated();
    const flick = [...ramp(12, 80, 3), 80, 80, 80, ...ramp(80, 12, 3)];
    expect(types(run(flick, normal, state, end).events)).toEqual(['correct']);
  });
});

describe('sensibilité', () => {
  const nudge = [...hold(47, 400), ...hold(12, 400)]; // 35° d'écart

  it('forte : un geste de 35° suffit', () => {
    const { state, end } = calibrated(tiltConfigs.high);
    expect(types(run(nudge, tiltConfigs.high, state, end).events)).toEqual(['correct']);
  });

  it('normale et faible : 35° ne suffisent pas', () => {
    for (const config of [tiltConfigs.normal, tiltConfigs.low]) {
      const { state, end } = calibrated(config);
      expect(run(nudge, config, state, end).events).toEqual([]);
    }
  });

  it('les seuils restent cohérents (réarmement < seuil)', () => {
    for (const config of Object.values(tiltConfigs)) {
      expect(config.rearm).toBeLessThan(config.trigger);
    }
  });
});

describe('screenPitch (gravité → angle de l’écran)', () => {
  const g = 9.81;
  // Téléphone en paysage, debout sur le front : la gravité suit l'axe X.
  const vertical: Gravity = { x: g, y: 0, z: 0 };
  // Écran vers le sol : la gravité mesurée vaut z ≈ −g sur Android.
  const screenDown: Gravity = { x: 0, y: 0, z: -g };
  const screenUp: Gravity = { x: 0, y: 0, z: g };

  it('vertical = 0°, écran vers le sol = +90°, vers le plafond = −90°', () => {
    const up = upSignFor(vertical, 90);
    expect(screenPitch(vertical, 90, up)).toBeCloseTo(0);
    expect(screenPitch(screenDown, 90, up)).toBeCloseTo(90);
    expect(screenPitch(screenUp, 90, up)).toBeCloseTo(-90);
  });

  it('marche en paysage gauche comme droit (l’axe s’inverse)', () => {
    const left: Gravity = { x: -g, y: 0, z: 0 };
    const up = upSignFor(left, -90);
    expect(up).toBe(-1);
    expect(screenPitch(left, -90, up)).toBeCloseTo(0);
    const tiltedDown: Gravity = {
      x: -g * Math.cos(Math.PI / 4),
      y: 0,
      z: -g * Math.sin(Math.PI / 4),
    };
    expect(screenPitch(tiltedDown, -90, up)).toBeCloseTo(45);
  });

  it('utilise l’axe Y en portrait', () => {
    const portrait: Gravity = { x: 0, y: g, z: 0 };
    expect(screenPitch(portrait, 0, upSignFor(portrait, 0))).toBeCloseTo(0);
  });
});
