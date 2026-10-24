import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback } from 'react';

/** Écrans en paysage actuellement affichés. */
let landscapeScreens = 0;
/** Délai avant de revenir en portrait, le temps qu'un écran paysage suivant prenne le relais. */
const RELEASE_DELAY_MS = 250;

const lock = (orientation: ScreenOrientation.OrientationLock) =>
  void ScreenOrientation.lockAsync(orientation).catch(() => undefined);

/**
 * Verrouille l'orientation tant que l'écran est affiché. Paysage : les deux sens (gauche et
 * droit) sont permis, le téléphone peut être posé sur le front dans un sens ou dans l'autre.
 * En quittant le dernier écran paysage, l'app revient en portrait ; d'un écran paysage à un
 * autre (écran « front » → partie), elle ne pivote pas entre les deux.
 */
export function useOrientationLock(orientation: 'landscape' | 'portrait') {
  useFocusEffect(
    useCallback(() => {
      if (orientation === 'portrait') {
        lock(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        return undefined;
      }
      landscapeScreens += 1;
      lock(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        landscapeScreens -= 1;
        setTimeout(() => {
          if (landscapeScreens === 0) lock(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }, RELEASE_DELAY_MS);
      };
    }, [orientation]),
  );
}
