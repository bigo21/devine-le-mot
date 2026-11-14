import { Canvas, useFrame } from '@react-three/fiber/native';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { Group } from 'three';

import { colors } from '@/ui/tokens';

import { FpsMeter, type FpsReport } from './fps-meter';
import { ContactShadow, Head, Phone } from './models';

/** Le téléphone 3D rejoint l'angle mesuré en douceur (≈ 1/10 du chemin par image à 60 fps). */
const FOLLOW = 10;

/** Téléphone posé sur le front, qui s'incline comme le vrai téléphone. */
function PhoneOnForehead({ pitch }: { pitch: React.RefObject<number> }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.x += (pitch.current - g.rotation.x) * Math.min(1, FOLLOW * delta);
  });
  return (
    <group ref={group} position={[0, 0.35, 1.05]}>
      <Phone screen={colors.lagoon} />
    </group>
  );
}

type Props = { onFps: (report: FpsReport) => void };

/**
 * Prototype du tutoriel 3D (DESIGN.md §6, Phase 4.1) : tête low-poly, téléphone qui suit
 * l'inclinaison réelle (DeviceMotion), lumières douces, ombre de contact. Mesure des fps.
 */
export default function TiltScene({ onFps }: Props) {
  // Angle d'inclinaison (radians), écrit par le capteur et lu dans la boucle de rendu : aucun
  // rendu React à chaque mesure.
  const pitch = useRef(0);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(16);
    const subscription = DeviceMotion.addListener((m) => {
      const g = m.accelerationIncludingGravity;
      if (!g) return;
      // Écran tenu à la verticale (portrait) : 0 ; vers le sol ou le plafond : ±π/2.
      pitch.current = Math.atan2(g.z, Math.abs(g.y) + 1e-6);
    });
    return () => subscription.remove();
  }, []);

  return (
    <Canvas style={styles.canvas} camera={{ position: [3.4, 1.6, 6.4], fov: 38 }}>
      <color attach="background" args={[colors.bg]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, 2, -2]} intensity={0.35} color={colors.lilac} />
      <group position={[0, -0.2, 0]}>
        <Head />
        <PhoneOnForehead pitch={pitch} />
        <ContactShadow y={-1.56} />
      </group>
      <FpsMeter onReport={onFps} />
    </Canvas>
  );
}

const styles = StyleSheet.create({ canvas: { flex: 1 } });
