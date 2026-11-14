import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { useTilt } from '@/features/game/use-tilt';
import { type RoundDuration, type Sensitivity, useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import type { LanguagePreference } from '@/lib/i18n';
import { Button, Icon, Screen, SegmentedControl, Text } from '@/ui/components';
import { pop, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing, touchTarget, type WordFont, wordFonts } from '@/ui/tokens';

/** Adresse de contact publique de « Donne ton avis » (UX.md §8). */
const FEEDBACK_EMAIL = 'gloic.ango@gmail.com';

const VOLUMES = { low: 0.35, medium: 0.7, high: 1 } as const;
type VolumeLevel = keyof typeof VOLUMES;
const DURATIONS: readonly RoundDuration[] = [30, 60, 90, 120];

/** Niveau de volume le plus proche de la valeur enregistrée. */
function volumeLevel(volume: number): VolumeLevel {
  if (volume <= (VOLUMES.low + VOLUMES.medium) / 2) return 'low';
  if (volume <= (VOLUMES.medium + VOLUMES.high) / 2) return 'medium';
  return 'high';
}

/** Réglages (UX.md §7) : minimalistes, regroupés par usage. */
export default function SettingsScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const settings = useSettings();
  const update = settings.update;
  const feedback = useFeedback();

  const toggle = (patch: Parameters<typeof update>[0]) => {
    feedback('select');
    update(patch);
  };

  return (
    <Screen scroll>
      <Text variant="display" accessibilityRole="header">
        {t('screens.settings')}
      </Text>

      <Section title={t('settings.sound')}>
        <ToggleRow
          label={t('settings.soundOn')}
          value={settings.sound}
          onChange={(sound) => toggle({ sound })}
        />
        {settings.sound ? (
          <Field label={t('settings.volume')}>
            <SegmentedControl
              options={(Object.keys(VOLUMES) as VolumeLevel[]).map((level) => ({
                value: level,
                label: t(`settings.volumes.${level}`),
              }))}
              value={volumeLevel(settings.volume)}
              onChange={(level) => {
                update({ volume: VOLUMES[level] });
                // Aperçu du volume choisi.
                feedback('found');
              }}
              accessibilityLabel={t('settings.volume')}
            />
          </Field>
        ) : null}
        <ToggleRow
          label={t('settings.haptics')}
          value={settings.haptics}
          onChange={(haptics) => toggle({ haptics })}
        />
      </Section>

      <Section title={t('settings.game')}>
        <Field label={t('settings.wordFont')}>
          <SegmentedControl
            options={(Object.keys(wordFonts) as WordFont[]).map((font) => ({
              value: font,
              label: t(`settings.wordFonts.${font}`),
            }))}
            value={settings.wordFont}
            onChange={(wordFont) => update({ wordFont })}
            accessibilityLabel={t('settings.wordFont')}
          />
          {/* Aperçu : le mot tel qu'il s'affichera en partie. */}
          <View
            style={styles.preview}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text
              style={[styles.previewWord, wordFonts[settings.wordFont]]}
              color={colors.onLagoon}
            >
              {t('settings.wordFontPreview')}
            </Text>
          </View>
        </Field>
        <Field label={t('settings.duration')}>
          <SegmentedControl
            options={DURATIONS.map((value) => ({
              value,
              label: t('setup.seconds', { count: value }),
            }))}
            value={settings.defaultDuration}
            onChange={(defaultDuration) => update({ defaultDuration })}
            accessibilityLabel={t('settings.duration')}
          />
        </Field>
      </Section>

      <Section title={t('settings.detection')}>
        <Field label={t('settings.sensitivity')} hint={t('settings.sensitivityHelp')}>
          <SegmentedControl
            options={(['low', 'normal', 'high'] as Sensitivity[]).map((value) => ({
              value,
              label: t(`settings.sensitivities.${value}`),
            }))}
            value={settings.sensitivity}
            onChange={(sensitivity) => update({ sensitivity })}
            accessibilityLabel={t('settings.sensitivity')}
          />
        </Field>
        <DetectionTest />
        <ToggleRow
          label={t('settings.tapMode')}
          hint={t('settings.tapModeHelp')}
          value={settings.tapMode}
          onChange={(tapMode) => toggle({ tapMode })}
        />
      </Section>

      <Section title={t('settings.display')}>
        <Field label={t('settings.language')}>
          <SegmentedControl
            options={(['system', 'fr', 'en'] as LanguagePreference[]).map((value) => ({
              value,
              label: t(`settings.languages.${value}`),
            }))}
            value={settings.language}
            onChange={(language) => update({ language })}
            accessibilityLabel={t('settings.language')}
          />
        </Field>
        <ToggleRow
          label={t('settings.reduceMotion')}
          hint={t('settings.reduceMotionHelp')}
          value={settings.reduceMotion}
          onChange={(reduceMotion) => toggle({ reduceMotion })}
        />
      </Section>

      <Section title={t('settings.help')}>
        <LinkRow label={t('settings.tutorial')} onPress={() => router.push('/tutorial')} />
        <LinkRow
          label={t('settings.feedback')}
          hint={t('settings.feedbackHint')}
          onPress={() =>
            void Linking.openURL(
              `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(t('settings.feedbackSubject'))}`,
            ).catch(() => undefined)
          }
        />
      </Section>

      <Section title={t('settings.about')}>
        <Text variant="bodyStrong">
          {t('app.name')} ·{' '}
          {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
        </Text>
        <Text muted>{t('settings.promise')}</Text>
        <Text variant="labelSmall">{t('settings.credits')}</Text>
        <Text variant="caption" muted>
          {t('settings.creditsList')}
        </Text>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="labelSmall">{label}</Text>
      {children}
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Ligne avec interrupteur : toute la ligne est touchable (cible ≥ 48 dp). */
function ToggleRow({ label, hint, value, onChange }: ToggleRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.bgSunken, true: colors.lagoon }}
        thumbColor={colors.text}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

function LinkRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <Icon icon={CaretRightIcon} color={colors.textMuted} />
    </Pressable>
  );
}

/** Zone de test de la sensibilité (UX.md §7) : le vrai moteur d'inclinaison, à la demande. */
function DetectionTest() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const [active, setActive] = useState(false);
  const [last, setLast] = useState<{ result: 'found' | 'passed'; key: number } | null>(null);

  const tilt = useTilt({
    enabled: active,
    onEvent: (event) => {
      if (event.type === 'calibrated') {
        feedback('calibrated');
        return;
      }
      const result = event.type === 'correct' ? 'found' : 'passed';
      feedback(result === 'found' ? 'found' : 'pass');
      setLast({ result, key: Date.now() });
    },
  });

  const start = () => {
    setLast(null);
    tilt.recalibrate();
    setActive(true);
  };

  if (!active) {
    return <Button label={t('settings.test')} variant="secondary" block onPress={start} />;
  }

  const status =
    tilt.available === false
      ? t('settings.testNoSensor')
      : tilt.calibrationProgress < 1
        ? t('settings.testCalibrating')
        : t('settings.testArmed');

  return (
    <View style={styles.test}>
      <Text variant="labelSmall" accessibilityLiveRegion="polite">
        {status}
      </Text>
      {last ? (
        <Animated.View key={last.key} entering={pop({ reduced })} style={styles.testResult}>
          <View
            style={[
              styles.badge,
              { backgroundColor: last.result === 'found' ? colors.palm : colors.pass },
            ]}
          >
            <Icon
              icon={last.result === 'found' ? CheckIcon : SkipForwardIcon}
              color={last.result === 'found' ? colors.onPalm : colors.onPass}
              emphasis
            />
            <Text variant="label" color={last.result === 'found' ? colors.onPalm : colors.onPass}>
              {last.result === 'found' ? t('settings.testFound') : t('settings.testPassed')}
            </Text>
          </View>
        </Animated.View>
      ) : null}
      <Button
        label={t('settings.testStop')}
        variant="ghost"
        block
        onPress={() => setActive(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  field: { gap: spacing.sm },
  row: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  preview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.lagoon,
  },
  previewWord: { fontSize: 40, lineHeight: 48 },
  test: { gap: spacing.sm },
  testResult: { alignItems: 'flex-start' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
});
