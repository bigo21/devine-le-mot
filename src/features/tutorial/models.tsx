// Modèles 3D du tutoriel, construits en code avec des primitives three.js (DESIGN.md §6 : pas
// de .glb, pas de drei). Matériaux mats aux couleurs des tokens.
import { type Ref, useMemo } from 'react';
import { ExtrudeGeometry, type MeshStandardMaterial, Shape } from 'three';

import { colors } from '@/ui/tokens';

/** Rectangle aux coins arrondis, centré, pour l'extrusion du téléphone. */
function roundedRect(width: number, height: number, radius: number): Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

const PHONE = { width: 1.6, height: 0.78, depth: 0.08, radius: 0.12 };

type PhoneProps = {
  /** Couleur de l'écran (catégorie, ou flash vert/orange d'un geste). */
  screen: string;
  /** Matériau de l'écran, pour changer sa couleur dans la boucle de rendu (sans rendu React). */
  screenRef?: Ref<MeshStandardMaterial>;
};

/** Téléphone tenu en paysage : coque nuit, écran coloré légèrement en relief. */
export function Phone({ screen, screenRef }: PhoneProps) {
  const body = useMemo(
    () =>
      new ExtrudeGeometry(roundedRect(PHONE.width, PHONE.height, PHONE.radius), {
        depth: PHONE.depth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 6,
      }),
    [],
  );
  const display = useMemo(
    () =>
      new ExtrudeGeometry(roundedRect(PHONE.width - 0.1, PHONE.height - 0.1, 0.08), {
        depth: 0.005,
        bevelEnabled: false,
        curveSegments: 6,
      }),
    [],
  );

  return (
    <group>
      <mesh geometry={body} position={[0, 0, -PHONE.depth / 2]}>
        <meshStandardMaterial color={colors.bgElevated} roughness={0.7} />
      </mesh>
      <mesh geometry={display} position={[0, 0, PHONE.depth / 2 + 0.021]}>
        <meshStandardMaterial
          ref={screenRef}
          color={screen}
          emissive={screen}
          emissiveIntensity={0.35}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

/** Tête stylisée low-poly (formes simples, pas réaliste), facettes visibles. */
export function Head() {
  return (
    <group>
      <mesh position={[0, 0, 0]} scale={[1, 1.15, 1]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={colors.clay} roughness={0.85} flatShading />
      </mesh>
      {/* Cou */}
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.38, 0.45, 0.6, 7]} />
        <meshStandardMaterial color={colors.clay} roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

/** Ombre de contact au sol : disque sombre translucide (pas de calcul d'ombre). */
export function ContactShadow({ y }: { y: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.4, 24]} />
      <meshBasicMaterial color={colors.bgSunken} transparent opacity={0.6} />
    </mesh>
  );
}
