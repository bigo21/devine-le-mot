import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tiltConfigs, type TiltEvent } from '@/features/game/tilt';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { type TiltSample, useTilt } from '@/features/game/use-tilt';
import { type Sensitivity, useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import { Button, SegmentedControl, Text } from '@/ui/components';
import { colors, radii, spacing } from '@/ui/tokens';

// Écran caché de réglage (docs/PROMPTS.md, étape 1.2) : angles en direct et événements détectés.

const REFRESH_MS = 100;
const GAUGE_RANGE = 90;
const SENSITIVITIES: readonly Sensitivity[] = ['low', 'normal', 'high'];

const format = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}°`);

export default function DevTiltScreen() {
  useOrientationLock('landscape');
  useKeepAwake();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const sensitivity = useSettings((s) => s.sensitivity);
  const updateSettings = useSettings((s) => s.update);
  const config = tiltConfigs[sensitivity];

  const latest = useRef<TiltSample | null>(null);
  const [sample, setSample] = useState<TiltSample | null>(null);
  const [events, setEvents] = useState<(TiltEvent & { id: number })[]>([]);
  const nextId = useRef(0);

  const tilt = useTilt({
    enabled: true,
    onSample: (value) => {
      latest.current = value;
    },
    onEvent: (event) => {
      if (event.type === 'correct') feedback('found');
      if (event.type === 'pass') feedback('pass');
      if (event.type === 'calibrated') feedback('calibrated');
      nextId.current += 1;
      setEvents((list) => [{ ...event, id: nextId.current }, ...list].slice(0, 6));
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

  const delta =
    sample?.smoothed != null && sample.reference != null
      ? sample.smoothed - sample.reference
      : null;
  const toGauge = (value: number) =>
    `${50 + (Math.max(-GAUGE_RANGE, Math.min(GAUGE_RANGE, value)) / GAUGE_RANGE) * 50}%` as const;

  const eventLabel = (event: TiltEvent) =>
    event.type === 'correct'
      ? t('game.found')
      : event.type === 'pass'
        ? t('game.pass')
        : `${t('devTilt.calibrated')} (${event.reference.toFixed(1)}°)`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingLeft: insets.left + spacing.xl,
        paddingRight: insets.right + spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text variant="title" accessibilityRole="header">
        {t('screens.devTilt')}
      </Text>
      <Text muted>{tilt.available === false ? t('devTilt.noSensor') : t('devTilt.intro')}</Text>

      <View style={styles.columns}>
        <View style={styles.values}>
          <Row
            label={t('devTilt.phase')}
            value={sample ? t(`devTilt.phases.${sample.phase}`) : '—'}
          />
          <Row label={t('devTilt.angle')} value={format(sample?.angle ?? null)} />
          <Row label={t('devTilt.smoothed')} value={format(sample?.smoothed ?? null)} />
          <Row label={t('devTilt.reference')} value={format(sample?.reference ?? null)} />
          <Row label={t('devTilt.delta')} value={format(delta)} />
          <Row label={t('devTilt.orientation')} value={sample ? `${sample.orientation}°` : '—'} />
        </View>

        <View style={styles.side}>
          <Text variant="labelSmall" muted>
            {t('devTilt.events')}
          </Text>
          {events.map((event) => (
            <Text key={event.id} variant="bodyStrong">
              {eventLabel(event)}
            </Text>
          ))}
        </View>
      </View>

      {/* Jauge : écart à la référence, seuils de déclenchement (pleins) et de réarmement (fins). */}
      <View style={styles.gauge} accessible={false}>
        {[-config.trigger, config.trigger].map((value) => (
          <View key={`t${value}`} style={[styles.mark, styles.trigger, { left: toGauge(value) }]} />
        ))}
        {[-config.rearm, config.rearm].map((value) => (
          <View key={`r${value}`} style={[styles.mark, styles.rearm, { left: toGauge(value) }]} />
        ))}
        {delta !== null ? <View style={[styles.needle, { left: toGauge(delta) }]} /> : null}
      </View>

      <SegmentedControl
        options={sensitivityOptions}
        value={sensitivity}
        onChange={(value) => updateSettings({ sensitivity: value })}
        accessibilityLabel={t('devTilt.sensitivity')}
      />
      <Button label={t('devTilt.recalibrate')} variant="secondary" onPress={tilt.recalibrate} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="labelSmall" muted>
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  columns: { flexDirection: 'row', gap: spacing.xxl },
  values: { flex: 1, gap: spacing.xs },
  side: { flex: 1, gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  value: { fontVariant: ['tabular-nums'] },
  gauge: {
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  mark: { position: 'absolute', top: 2, bottom: 2 },
  trigger: { width: 3, backgroundColor: colors.mango },
  rearm: { width: 1, backgroundColor: colors.textMuted },
  needle: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 6,
    marginLeft: -3,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
  },
});
