import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FpsReport } from '@/features/tutorial/fps-meter';
import { Text } from '@/ui/components';
import { colors, radii, spacing } from '@/ui/tokens';

// three.js n'est évalué qu'à l'ouverture de cet écran (DESIGN.md §6 : 3D chargée à la demande).
/** Secondes ignorées au démarrage (compilation des shaders). */
const WARMUP_SECONDS = 3;

const TiltScene = lazy(() => import('@/features/tutorial/tilt-scene'));

/** Écran caché de mesure (Phase 4.1) : la scène 3D du tutoriel est-elle viable sur ce téléphone ? */
export default function DevThreeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [fps, setFps] = useState<FpsReport | null>(null);
  const [lowest, setLowest] = useState<number | null>(null);

  // Les premières secondes compilent les shaders : elles ne comptent pas dans le pire cas.
  const [warmup, setWarmup] = useState(WARMUP_SECONDS);
  const onFps = (report: FpsReport) => {
    setFps(report);
    if (warmup > 0) {
      setWarmup((n) => n - 1);
      return;
    }
    setLowest((current) => (current === null ? report.average : Math.min(current, report.average)));
  };

  return (
    <View style={styles.root}>
      <Suspense fallback={<View style={styles.root} />}>
        <TiltScene onFps={onFps} />
      </Suspense>
      <View style={[styles.hud, { top: insets.top + spacing.md }]} pointerEvents="none">
        <Text variant="label">{t('screens.devThree')}</Text>
        <Text variant="labelSmall">
          {fps
            ? t('dev.fps', {
                average: Math.round(fps.average),
                worst: Math.round(fps.worst),
                lowest: Math.round(lowest ?? fps.average),
              })
            : t('dev.fpsWaiting')}
        </Text>
        <Text variant="caption" muted>
          {t('dev.threeHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hud: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.scrim,
  },
});
