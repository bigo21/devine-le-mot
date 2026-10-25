import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

import { useSettings } from '@/features/settings/store';

import {
  calibrationProgress,
  initialTiltState,
  recalibrate as resetCalibration,
  type ScreenOrientation,
  screenPitch,
  stepTilt,
  tiltConfigs,
  type TiltEvent,
  type TiltState,
  upSignFor,
} from './tilt';

/** Intervalle des mesures DeviceMotion (GAMEPLAY.md §2). */
const SAMPLE_INTERVAL_MS = 50;
/** La jauge de calibration n'est mise à jour que par paliers (pas de rendu à chaque mesure). */
const PROGRESS_STEP = 0.05;

export type TiltSample = {
  at: number;
  angle: number;
  smoothed: number | null;
  reference: number | null;
  phase: TiltState['phase'];
  orientation: ScreenOrientation;
};

type Options = {
  /** Écoute le capteur seulement quand c'est utile (écran front, partie en cours). */
  enabled: boolean;
  onEvent?: (event: TiltEvent) => void;
  /** Chaque mesure traitée : réservé à l'écran de réglage /dev/tilt. */
  onSample?: (sample: TiltSample) => void;
};

function toOrientation(value: number): ScreenOrientation {
  return value === 90 || value === -90 || value === 180 ? value : 0;
}

/**
 * Branche DeviceMotion sur la détection pure de `tilt.ts` : calibration, gestes, sensibilité
 * des réglages. Aucun rendu React par mesure : l'état vit dans des refs.
 */
export function useTilt({ enabled, onEvent, onSample }: Options) {
  const sensitivity = useSettings((s) => s.sensitivity);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);

  const state = useRef<TiltState>(initialTiltState());
  const upSign = useRef<1 | -1 | null>(null);
  const lastOrientation = useRef<ScreenOrientation | null>(null);
  // Fonctions stables qui lisent toujours les dernières callbacks, sans relancer l'abonnement.
  const emitEvent = useEffectEvent((event: TiltEvent) => onEvent?.(event));
  const emitSample = useEffectEvent((sample: TiltSample) => onSample?.(sample));

  const recalibrate = useCallback(() => {
    state.current = resetCalibration(state.current);
    upSign.current = null;
    setProgress(0);
  }, []);

  useEffect(() => {
    let active = true;
    void DeviceMotion.isAvailableAsync().then((ok) => {
      if (active) setAvailable(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || available !== true) return;
    const config = tiltConfigs[sensitivity];
    DeviceMotion.setUpdateInterval(SAMPLE_INTERVAL_MS);

    const subscription = DeviceMotion.addListener((measurement: DeviceMotionMeasurement) => {
      const gravity = measurement.accelerationIncludingGravity;
      if (!gravity) return;
      const orientation = toOrientation(measurement.orientation);
      const now = Date.now();
      // Retourner le téléphone (paysage gauche ↔ droit) inverse l'axe : on recalibre.
      if (lastOrientation.current !== null && lastOrientation.current !== orientation) {
        // État neuf : les mesures lissées de l'ancienne orientation n'ont plus de sens.
        state.current = initialTiltState();
        upSign.current = null;
      }
      lastOrientation.current = orientation;
      // Le sens de l'axe « haut de l'écran » est fixé pendant la calibration.
      if (state.current.phase === 'calibrating' || upSign.current === null) {
        upSign.current = upSignFor(gravity, orientation);
      }
      const angle = screenPitch(gravity, orientation, upSign.current);
      const result = stepTilt(state.current, angle, now, config);
      state.current = result.state;

      const next = calibrationProgress(result.state, now, config);
      setProgress((previous) =>
        next === 1 || next === 0 || Math.abs(next - previous) >= PROGRESS_STEP ? next : previous,
      );
      for (const event of result.events) emitEvent(event);
      emitSample({
        at: now,
        angle,
        smoothed: result.state.smoothed,
        reference: result.state.reference,
        phase: result.state.phase,
        orientation,
      });
    });

    return () => subscription.remove();
  }, [enabled, available, sensitivity]);

  return {
    /** null tant qu'on ne sait pas ; false = pas de capteur : proposer le mode tap. */
    available,
    /** Avancement de la calibration, de 0 à 1. */
    calibrationProgress: progress,
    recalibrate,
  };
}
