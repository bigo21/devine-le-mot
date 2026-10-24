import { Canvas, Group, Path, RoundedRect, Oval, usePathValue } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easing, motion, spring, timing, useReducedMotion } from '@/ui/motion';
import { colors } from '@/ui/tokens';

import { type MascotState, mouthControls, nextBlinkDelay, poses } from './poses';

type Props = {
  state: MascotState;
  size?: number;
};

// Le dessin vit dans un repère 100 × 100, mis à l'échelle de `size`.
const EYE_Y = 42;
const EYE_X = [38, 62] as const;
const MOUTH_Y = 60;
const TAIL = 'M30 72 L22 92 Q21 95 25 93 L46 76 Z';

/**
 * Mascotte géométrique : une bulle de dialogue qui réagit (docs/ASSETS.md §2, MOTION.md §3).
 * Décorative : l'écran qui l'affiche porte le message en texte.
 */
export function Mascot({ state, size = 120 }: Props) {
  const reduced = useReducedMotion();
  const pose = poses[state];

  const eyeOpen = useSharedValue(pose.eyeOpen);
  const blink = useSharedValue(1);
  const lookX = useSharedValue(pose.lookX);
  const lookY = useSharedValue(pose.lookY);
  const mouthCurve = useSharedValue(pose.mouthCurve);
  const mouthOpen = useSharedValue(pose.mouthOpen);
  const mouthShift = useSharedValue(pose.mouthShift);
  const tilt = useSharedValue(pose.tilt);
  const scale = useSharedValue(pose.scale);
  const breath = useSharedValue(1);
  const lift = useSharedValue(0);

  // Pose de l'état : ressort doux (ou immédiat en mode réduit).
  useEffect(() => {
    const to = (value: number) => (reduced ? value : withSpring(value, spring.gentle));
    eyeOpen.set(to(pose.eyeOpen));
    lookX.set(to(pose.lookX));
    lookY.set(to(pose.lookY));
    mouthCurve.set(to(pose.mouthCurve));
    mouthOpen.set(to(pose.mouthOpen));
    mouthShift.set(to(pose.mouthShift));
    scale.set(to(pose.scale));

    cancelAnimation(tilt);
    cancelAnimation(breath);
    cancelAnimation(lift);
    breath.set(1);
    lift.set(0);
    tilt.set(to(pose.tilt));
    if (reduced) return;

    if (state === 'rest') {
      breath.set(
        withRepeat(
          withTiming(motion.breatheScale, {
            duration: motion.breatheDuration / 2,
            easing: easing.breathe,
          }),
          -1,
          true,
        ),
      );
    } else if (state === 'wave') {
      tilt.set(
        withSequence(
          withSpring(-9, spring.snappy),
          withSpring(9, spring.snappy),
          withSpring(-9, spring.snappy),
          withSpring(9, spring.snappy),
          withSpring(0, spring.gentle),
        ),
      );
    } else if (state === 'celebrate') {
      const jump = withSequence(
        withTiming(-12, { duration: 160, easing: easing.out }),
        withSpring(0, spring.bouncy),
      );
      lift.set(withRepeat(jump, 3, false));
    } else if (state === 'think') {
      tilt.set(
        withDelay(
          timing.base.duration,
          withRepeat(withTiming(-2, { duration: 1600, easing: easing.breathe }), -1, true),
        ),
      );
    }
  }, [
    state,
    reduced,
    pose,
    eyeOpen,
    lookX,
    lookY,
    mouthCurve,
    mouthOpen,
    mouthShift,
    tilt,
    scale,
    breath,
    lift,
  ]);

  // Clignement aléatoire au repos (3 à 6 s), jamais en mode réduit.
  useEffect(() => {
    if (state !== 'rest' || reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        blink.set(
          withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 120 })),
        );
        schedule();
      }, nextBlinkDelay(Math.random()));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [state, reduced, blink]);

  const body = useDerivedValue(() => [
    { translateY: lift.get() },
    { rotate: (tilt.get() * Math.PI) / 180 },
    { scale: scale.get() * breath.get() },
  ]);

  const eyes = usePathValue((builder) => {
    'worklet';
    const open = Math.max(0.08, eyeOpen.get() * blink.get());
    const rx = 5;
    const ry = 7 * open;
    for (const x of EYE_X) {
      const cx = x + lookX.get();
      const cy = EYE_Y + lookY.get();
      builder.addOval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 });
    }
  });

  const mouth = usePathValue((builder) => {
    'worklet';
    const { top, bottom } = mouthControls(
      { mouthCurve: mouthCurve.get(), mouthOpen: mouthOpen.get() },
      MOUTH_Y,
    );
    const half = 10 * (1 - mouthOpen.get() * 0.35);
    const cx = 50 + mouthShift.get();
    builder
      .moveTo(cx - half, MOUTH_Y)
      .quadTo(cx, top, cx + half, MOUTH_Y)
      .quadTo(cx, bottom, cx - half, MOUTH_Y)
      .close();
  });

  const ink = colors.onMango;

  return (
    <Canvas
      style={{ width: size, height: size }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Group transform={[{ scale: size / 100 }]}>
        <Group origin={{ x: 50, y: 88 }} transform={body}>
          <Path path={TAIL} color={colors.mango} />
          <RoundedRect x={10} y={12} width={80} height={64} r={30} color={colors.mango} />
          <Oval x={22} y={18} width={20} height={8} color={colors.highlight} />
          <Path path={eyes} color={ink} />
          <Path path={mouth} color={ink} />
          <Path
            path={mouth}
            color={ink}
            style="stroke"
            strokeWidth={3.5}
            strokeCap="round"
            strokeJoin="round"
          />
        </Group>
      </Group>
    </Canvas>
  );
}
