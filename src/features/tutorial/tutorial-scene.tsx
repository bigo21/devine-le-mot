import { Canvas, useFrame } from '@react-three/fiber/native';
import { type RefObject, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Color, type Group, type MeshStandardMaterial } from 'three';

import { colors } from '@/ui/tokens';

import { ContactShadow, Head, Phone } from './models';

/** Étapes du tutoriel (DESIGN.md §6). */
export type TutorialStep = 'place' | 'found' | 'pass' | 'try' | 'variants';

/** Position du téléphone posé sur le front, et position de départ (dans la main, plus bas). */
const ON_FOREHEAD = { y: 0.35, z: 1.05 };
const IN_HAND = { y: -1.4, z: 2.4 };
/** Inclinaison montrée dans les démonstrations (≈ seuil de déclenchement du jeu, 40°). */
const DEMO_TILT = (45 * Math.PI) / 180;
/** Durée d'une boucle de démonstration (s) : approche, inclinaison, retour, pause. */
const LOOP = 3.2;
/** Le téléphone rejoint sa cible en douceur (≈ 1/8 du chemin par image à 60 fps). */
const FOLLOW = 8;

const SCREEN = new Color(colors.lagoon);
const FOUND = new Color(colors.palm);
const PASS = new Color(colors.pass);

/** Courbe douce 0 → 1 → 0 sur une boucle : montée, palier, descente, pause. */
function pulse(t: number): number {
  const p = (t % LOOP) / LOOP;
  if (p < 0.2) return easeInOut(p / 0.2);
  if (p < 0.55) return 1;
  if (p < 0.75) return 1 - easeInOut((p - 0.55) / 0.2);
  return 0;
}

function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

type DemoPhoneProps = {
  step: TutorialStep;
  reduced: boolean;
  /** Étape « Essaie toi-même » : inclinaison réelle (radians, par rapport à la position neutre). */
  tilt: RefObject<number>;
  /** Étape « Essaie toi-même » : flash après un geste réussi (couleur, fin en ms). */
  flash: RefObject<{ color: 'found' | 'pass'; until: number } | null>;
};

/** Téléphone animé selon l'étape : il monte sur le front, s'incline, ou suit le vrai téléphone. */
function DemoPhone({ step, reduced, tilt, flash }: DemoPhoneProps) {
  const group = useRef<Group>(null);
  const screen = useRef<MeshStandardMaterial>(null);
  const clock = useRef(0);
  const lastStep = useRef(step);

  useFrame((_, delta) => {
    const g = group.current;
    const material = screen.current;
    if (!g || !material) return;
    // Chaque étape repart du début de sa boucle.
    if (lastStep.current !== step) {
      lastStep.current = step;
      clock.current = 0;
    }
    clock.current += delta;
    const k = reduced ? 1 : pulse(clock.current);

    let y = ON_FOREHEAD.y;
    let z = ON_FOREHEAD.z;
    let rotation = 0;
    let target = SCREEN;

    if (step === 'place') {
      // Mode réduit : téléphone déjà posé, sans trajet.
      y = IN_HAND.y + (ON_FOREHEAD.y - IN_HAND.y) * k;
      z = IN_HAND.z + (ON_FOREHEAD.z - IN_HAND.z) * k;
    } else if (step === 'found' || step === 'pass') {
      rotation = (step === 'found' ? 1 : -1) * DEMO_TILT * k;
      if (k > 0.8) target = step === 'found' ? FOUND : PASS;
    } else if (step === 'try') {
      rotation = tilt.current;
      const f = flash.current;
      if (f && Date.now() < f.until) target = f.color === 'found' ? FOUND : PASS;
    } else {
      // Variantes : le téléphone se balance doucement, comme au repos.
      rotation = reduced ? 0 : Math.sin(clock.current * 1.2) * 0.08;
    }

    const step01 = Math.min(1, FOLLOW * delta);
    g.position.y += (y - g.position.y) * step01;
    g.position.z += (z - g.position.z) * step01;
    g.rotation.x += (rotation - g.rotation.x) * step01;
    material.color.lerp(target, step01);
    material.emissive.copy(material.color);
  });

  return (
    <group ref={group} position={[0, ON_FOREHEAD.y, ON_FOREHEAD.z]}>
      <Phone screen={colors.lagoon} screenRef={screen} />
    </group>
  );
}

/** Rotation de la scène au doigt (angle autour de la verticale, écrit par le geste). */
function Orbit({ yaw, children }: { yaw: SharedValue<number>; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (yaw.get() - g.rotation.y) * Math.min(1, FOLLOW * delta);
  });
  return <group ref={group}>{children}</group>;
}

/** Signale la première image affichée (le fondu d'entrée masque la compilation des shaders). */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

type Props = DemoPhoneProps & {
  yaw: SharedValue<number>;
  onReady: () => void;
};

/**
 * Scène 3D du tutoriel (DESIGN.md §6) : tête low-poly et téléphone en primitives, lumières douces,
 * ombre de contact. Toute l'animation vit dans la boucle de rendu : aucun rendu React par image.
 */
export default function TutorialScene({ yaw, onReady, ...phone }: Props) {
  return (
    <Canvas style={styles.canvas} camera={{ position: [3.4, 1.4, 6.6], fov: 34 }}>
      <color attach="background" args={[colors.bg]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, 2, -2]} intensity={0.35} color={colors.lilac} />
      <Orbit yaw={yaw}>
        <group position={[0, -0.1, 0]}>
          <Head />
          <DemoPhone {...phone} />
          <ContactShadow y={-1.56} />
        </group>
      </Orbit>
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}

const styles = StyleSheet.create({ canvas: { flex: 1 } });
