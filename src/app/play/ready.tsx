import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { ArrowFatDownIcon } from 'phosphor-react-native/src/icons/ArrowFatDown';
import { ArrowFatUpIcon } from 'phosphor-react-native/src/icons/ArrowFatUp';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalibrationRing } from '@/features/game/components/calibration-ring';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { useTilt } from '@/features/game/use-tilt';
import { useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Icon, NdopPattern, Text } from '@/ui/components';
import { Mascot } from '@/ui/mascot';
import { rise, useReducedMotion } from '@/ui/motion';
import { colors, patternOpacity, spacing } from '@/ui/tokens';

/** Délai avant de proposer le mode tap si la calibration n'aboutit pas (UX.md §5). */
const CALIBRATION_HELP_MS = 6000;

export default function PlayReadyScreen() {
  useOrientationLock('landscape');
  useKeepAwake();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const round = useGameSession((s) => s.round);
  const tapMode = useSettings((s) => s.tapMode);
  const updateSettings = useSettings((s) => s.update);
  const [needsHelp, setNeedsHelp] = useState(false);

  useEffect(() => {
    if (!round) router.replace('/play/setup');
  }, [round]);

  const tilt = useTilt({
    enabled: !tapMode,
    onEvent: (event) => {
      if (event.type !== 'calibrated') return;
      // Anneau plein → vibration de succès → compte à rebours (MOTION.md §3).
      feedback('calibrated');
      router.replace('/play/game');
    },
  });

  useEffect(() => {
    if (tapMode) return;
    const timer = setTimeout(() => setNeedsHelp(true), CALIBRATION_HELP_MS);
    return () => clearTimeout(timer);
  }, [tapMode]);

  const playWithTaps = tapMode || tilt.available === false;

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingLeft: insets.left + spacing.xl,
          paddingRight: insets.right + spacing.xl,
        },
      ]}
    >
      <NdopPattern color={colors.text} opacity={patternOpacity.screen} />

      <CalibrationRing progress={playWithTaps ? 0 : tilt.calibrationProgress} size={196}>
        <Mascot state="attention" size={120} />
      </CalibrationRing>

      <Animated.View entering={rise({ reduced })} style={styles.texts}>
        <Text variant="title" accessibilityRole="header">
          {t('ready.title')}
        </Text>

        {playWithTaps ? (
          <>
            <Text muted>{tilt.available === false ? t('ready.noSensor') : t('ready.tapHint')}</Text>
            <Button
              label={t('ready.tapStart')}
              size="lg"
              onPress={() => router.replace('/play/game')}
            />
          </>
        ) : (
          <>
            <Text muted>{needsHelp ? t('ready.tooLong') : t('ready.hint')}</Text>
            <View style={styles.gestures}>
              <View style={styles.gesture}>
                <Icon icon={ArrowFatDownIcon} color={colors.palm} emphasis />
                <Text variant="labelSmall">{t('ready.gestureDown')}</Text>
              </View>
              <View style={styles.gesture}>
                <Icon icon={ArrowFatUpIcon} color={colors.pass} emphasis />
                <Text variant="labelSmall">{t('ready.gestureUp')}</Text>
              </View>
            </View>
            {needsHelp ? (
              <Button
                label={t('ready.switchToTap')}
                variant="secondary"
                onPress={() => updateSettings({ tapMode: true })}
              />
            ) : null}
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
    backgroundColor: colors.bg,
  },
  texts: { flex: 1, gap: spacing.md, alignItems: 'flex-start' },
  gestures: { gap: spacing.sm },
  gesture: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
