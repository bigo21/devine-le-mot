import { useKeepAwake } from 'expo-keep-awake';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalibrationRing } from '@/features/game/components/calibration-ring';
import { tiltConfigs } from '@/features/game/tilt';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { type TiltSample, useTilt } from '@/features/game/use-tilt';
import { type Sensitivity, useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Icon, SegmentedControl, SurfaceContext, Text } from '@/ui/components';
import { pop, useReducedMotion } from '@/ui/motion';
import { colors, onColor, radii, spacing } from '@/ui/tokens';

// Écran caché de test de l'inclinaison (étape 1.2), en langage simple : consigne de l'étape,
// dernier geste en très grand, position sur une jauge parlante, sensibilité.

const REFRESH_MS = 100;
const GAUGE_RANGE = 90;
const SENSITIVITIES: readonly Sensitivity[] = ['low', 'normal', 'high'];

type Gesture = { type: 'correct' | 'pass'; id: number };

const degrees = (value: number | null) => (value === null ? '—' : `${Math.round(value)}°`);

export default function DevTiltScreen() {
  useOrientationLock('landscape');
  useKeepAwake();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const sensitivity = useSettings((s) => s.sensitivity);
  const updateSettings = useSettings((s) => s.update);
  const config = tiltConfigs[sensitivity];

  const latest = useRef<TiltSample | null>(null);
  const [sample, setSample] = useState<TiltSample | null>(null);
  const [last, setLast] = useState<Gesture | null>(null);
  const [counts, setCounts] = useState({ found: 0, passed: 0 });

  const tilt = useTilt({
    enabled: true,
    onSample: (value) => {
      latest.current = value;
    },
    onEvent: (event) => {
      if (event.type === 'calibrated') {
        feedback('calibrated');
        return;
      }
      feedback(event.type === 'correct' ? 'found' : 'pass');
      setLast({ type: event.type, id: event.at });
      setCounts((c) =>
        event.type === 'correct' ? { ...c, found: c.found + 1 } : { ...c, passed: c.passed + 1 },
      );
    },
  });

  // Affichage rafraîchi 10 fois par seconde, pas à chaque mesure.
  useEffect(() => {
    const interval = setInterval(() => setSample(latest.current), REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const sensitivityOptions = useMemo(
    () => SENSITIVITIES.map((value) => ({ value, label: t(`devTilt.sensitivities.${value}`) })),
    [t],
  );

  const restart = () => {
    tilt.recalibrate();
    setLast(null);
    setCounts({ found: 0, passed: 0 });
  };

  const phase = sample?.phase ?? 'calibrating';
  const delta =
    sample?.smoothed != null && sample.reference != null
      ? sample.smoothed - sample.reference
      : null;
  const toGauge = (value: number) =>
    `${50 + (Math.max(-GAUGE_RANGE, Math.min(GAUGE_RANGE, value)) / GAUGE_RANGE) * 50}%` as const;

  const found = last?.type === 'correct';
  const lastAccent = found ? 'palm' : 'pass';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingLeft: insets.left + spacing.xl,
        paddingRight: insets.right + spacing.xl,
        gap: spacing.lg,
      }}
    >
      <View style={styles.top}>
        {phase === 'calibrating' ? (
          <CalibrationRing progress={tilt.calibrationProgress} size={88} />
        ) : null}
        <Text variant="title" style={styles.instruction} accessibilityLiveRegion="polite">
          {tilt.available === false ? t('devTilt.noSensor') : t(`devTilt.${phase}`)}
        </Text>
      </View>

      <View style={styles.middle}>
        {/* Dernier geste, en très grand : lisible par les autres joueurs. */}
        <View style={styles.lastBox}>
          <Text variant="labelSmall" muted>
            {t('devTilt.lastGesture')}
          </Text>
          {last ? (
            <Animated.View
              key={last.id}
              entering={pop({ reduced })}
              style={[styles.lastCard, { backgroundColor: colors[lastAccent] }]}
            >
              <SurfaceContext
                value={{ foreground: onColor(lastAccent), muted: onColor(lastAccent) }}
              >
                <Icon icon={found ? CheckIcon : SkipForwardIcon} size={48} />
                <Text variant="display">{found ? t('game.found') : t('game.passed')}</Text>
              </SurfaceContext>
            </Animated.View>
          ) : (
            <Text variant="bodyLarge" muted>
              {t('devTilt.none')}
            </Text>
          )}
          <Text variant="bodyStrong">
            {t('devTilt.counts', { found: counts.found, passed: counts.passed })}
          </Text>
        </View>

        {/* Jauge parlante : où est le téléphone par rapport à la position droite. */}
        <View style={styles.gaugeBox}>
          <View style={styles.gauge} accessible={false}>
            <View
              style={[styles.zone, styles.passZone, { left: 0, width: toGauge(-config.trigger) }]}
            />
            <View
              style={[styles.zone, styles.foundZone, { left: toGauge(config.trigger), right: 0 }]}
            />
            {delta !== null ? <View style={[styles.needle, { left: toGauge(delta) }]} /> : null}
          </View>
          <View style={styles.gaugeLabels}>
            <Text variant="caption" muted>
              {`${t('devTilt.gaugeCeiling')} · ${t('game.pass')}`}
            </Text>
            <Text variant="caption" muted>
              {t('devTilt.gaugeStraight')}
            </Text>
            <Text variant="caption" muted>
              {`${t('game.found')} · ${t('devTilt.gaugeFloor')}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.settings}>
        <View style={styles.sensitivity}>
          <SegmentedControl
            options={sensitivityOptions}
            value={sensitivity}
            onChange={(value) => updateSettings({ sensitivity: value })}
            accessibilityLabel={t('devTilt.sensitivity')}
          />
          <Text variant="caption" muted>
            {t('devTilt.sensitivityHelp')}
          </Text>
        </View>
        <Button label={t('devTilt.restart')} variant="secondary" onPress={restart} />
      </View>

      <Text variant="caption" muted>
        {t('devTilt.details', {
          angle: degrees(sample?.smoothed ?? null),
          reference: degrees(sample?.reference ?? null),
          delta: degrees(delta),
          orientation: sample ? `${sample.orientation}°` : '—',
        })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  instruction: { flex: 1 },
  middle: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' },
  lastBox: { flex: 1, gap: spacing.sm },
  lastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignSelf: 'flex-start',
  },
  gaugeBox: { flex: 1, gap: spacing.sm, paddingTop: spacing.xl },
  gauge: {
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  zone: { position: 'absolute', top: 0, bottom: 0, opacity: 0.45 },
  passZone: { backgroundColor: colors.pass },
  foundZone: { backgroundColor: colors.palm },
  needle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 8,
    marginLeft: -4,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
  },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  settings: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  sensitivity: { flex: 1, gap: spacing.xs },
});
