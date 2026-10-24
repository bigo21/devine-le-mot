import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettings } from '@/features/settings/store';

/**
 * Vrai si le système (« Supprimer les animations ») ou le réglage de l'app demande moins
 * de mouvement. Dans ce cas : fondus de 150 ms, pas de boucle, pas de particules (MOTION.md §4).
 */
export function useReducedMotion(): boolean {
  const appSetting = useSettings((s) => s.reduceMotion);
  const [system, setSystem] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setSystem(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return appSetting || system;
}
