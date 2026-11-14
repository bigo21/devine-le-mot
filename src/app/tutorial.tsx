import { router } from 'expo-router';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
import { type ComponentRef, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VariantIcon } from '@/features/game/components/variant-icon';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { useTilt } from '@/features/game/use-tilt';
import { variantOrder } from '@/features/game/variants';
import { useSettings } from '@/features/settings/store';
import type { TutorialStep } from '@/features/tutorial/tutorial-scene';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Icon, Text } from '@/ui/components';
import { motion, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

// three.js n'est évalué qu'à l'ouverture du tutoriel (DESIGN.md §6 : 3D chargée à la demande).
const TutorialScene = lazy(() => import('@/features/tutorial/tutorial-scene'));

const STEPS: readonly TutorialStep[] = ['place', 'found', 'pass', 'try', 'variants'];
const DEG = Math.PI / 180;
/** Rotation au doigt limitée : la tête reste toujours de face ou de trois quarts. */
const MAX_YAW = 70 * DEG;
/** Inclinaison suivie au plus (le téléphone 3D ne se retourne pas). */
const MAX_TILT = 75 * DEG;

/**
 * Tutoriel interactif en 3D (DESIGN.md §6, UX.md §3) : comment tenir le téléphone et quels gestes
 * faire, en 5 étapes à faire glisser. « Essaie toi-même » utilise le vrai moteur d'inclinaison.
 */
export default function TutorialScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const updateSettings = useSettings((s) => s.update);

  const [index, setIndex] = useState(0);
  const step = STEPS[index] ?? 'place';
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);

  // --- Scène : rotation au doigt et fondu d'entrée ------------------------------------------
  // La boucle de rendu 3D tourne sur le fil JS : le geste y écrit l'angle directement (une ref
  // lue à chaque image), sans passer par une valeur partagée Reanimated.
  const yaw = useRef(0);
  const yawStart = useRef(0);
  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-10, 10],
    onActivate: () => {
      yawStart.current = yaw.current;
    },
    onUpdate: (e) => {
      const next = yawStart.current + (e.translationX / width) * Math.PI;
      yaw.current = Math.max(-MAX_YAW, Math.min(MAX_YAW, next));
    },
  });

  const [ready, setReady] = useState(false);
  const cover = useSharedValue(1);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (ready) cover.set(withTiming(0, { duration: motion.flashDuration }));
  }, [cover, ready]);
  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.get() }));

  // --- « Essaie toi-même » : vrai moteur d'inclinaison --------------------------------------
  const tiltRef = useRef(0);
  const flashRef = useRef<{ color: 'found' | 'pass'; until: number } | null>(null);
  const [tried, setTried] = useState({ found: false, pass: false });
  const trying = step === 'try';

  const tilt = useTilt({
    enabled: trying,
    onEvent: (event) => {
      if (event.type === 'calibrated') {
        feedback('calibrated');
        return;
      }
      const color = event.type === 'correct' ? 'found' : 'pass';
      flashRef.current = { color, until: Date.now() + motion.flashDuration };
      feedback(color === 'found' ? 'found' : 'pass');
      setTried((current) => ({ ...current, [color]: true }));
    },
    onSample: (sample) => {
      if (sample.reference === null || sample.smoothed === null) return;
      const angle = (sample.smoothed - sample.reference) * DEG;
      tiltRef.current = Math.max(-MAX_TILT, Math.min(MAX_TILT, angle));
    },
  });

  // En arrivant sur l'étape, on recalibre : la position du moment devient la position neutre.
  const { recalibrate } = tilt;
  useEffect(() => {
    if (!trying) return;
    tiltRef.current = 0;
    recalibrate();
  }, [recalibrate, trying]);

  const succeeded = tried.found && tried.pass;
  useEffect(() => {
    if (succeeded) feedback('record');
  }, [feedback, succeeded]);

  // --- Navigation entre les étapes ----------------------------------------------------------
  const goTo = (next: number) => {
    pager.current?.scrollTo({ x: next * width, animated: !reduced });
    setIndex(next);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = () => {
    updateSettings({ hasSeenOnboarding: true });
    router.replace('/play/setup');
  };

  const skip = () => {
    updateSettings({ hasSeenOnboarding: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const last = index === STEPS.length - 1;

  return (
    <View style={styles.root}>
      <View style={styles.scene}>
        <Suspense fallback={null}>
          <TutorialScene
            step={step}
            reduced={reduced}
            tilt={tiltRef}
            flash={flashRef}
            yaw={yaw}
            onReady={onReady}
          />
        </Suspense>
        {/* Calque transparent au-dessus du canvas GL : c'est lui qui reçoit le geste de rotation
              (la vue GL native garderait les touches pour elle). */}
        <GestureDetector gesture={pan}>
          <View
            style={StyleSheet.absoluteFill}
            collapsable={false}
            accessibilityLabel={t('tutorial.rotateHint')}
          />
        </GestureDetector>
        {/* Fondu d'entrée : masque la compilation des shaders (première image lente). */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.cover, coverStyle]}
        >
          <Text muted>{t('tutorial.loading')}</Text>
        </Animated.View>
        <View style={[styles.hint, { top: insets.top + spacing.md }]} pointerEvents="none">
          <Text variant="caption" muted>
            {t('tutorial.rotateHint')}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {STEPS.map((id, i) => (
          <View key={id} style={[styles.card, { width }]} accessible={i === index}>
            <Text variant="labelSmall" muted>
              {t('tutorial.stepOf', { step: i + 1, total: STEPS.length })}
            </Text>
            <Text variant="title" accessibilityRole="header">
              {t(`tutorial.steps.${id}.title`)}
            </Text>
            <Text muted>{t(`tutorial.steps.${id}.body`)}</Text>

            {id === 'try' ? (
              <View style={styles.try} accessibilityLiveRegion="polite">
                {tilt.available === false ? (
                  <Text variant="labelSmall">{t('tutorial.try.noSensor')}</Text>
                ) : succeeded ? (
                  <Text variant="label" color={colors.palm}>
                    {t('tutorial.try.done')}
                  </Text>
                ) : (
                  <Text variant="labelSmall">
                    {tilt.calibrationProgress < 1
                      ? t('tutorial.try.calibrating')
                      : t('tutorial.try.ready')}
                  </Text>
                )}
                <View style={styles.checks}>
                  <Check done={tried.found} label={t('tutorial.try.found')} />
                  <Check done={tried.pass} label={t('tutorial.try.pass')} />
                </View>
              </View>
            ) : null}

            {id === 'variants' ? (
              <View style={styles.variants}>
                {variantOrder.map((variant) => (
                  <View key={variant} style={styles.variant}>
                    <VariantIcon variant={variant} size={36} active={index === i} />
                    <Text variant="caption" numberOfLines={2} align="center">
                      {t(`variants.${variant}.name`)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots} accessible={false}>
          {STEPS.map((id, i) => (
            <View key={id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.actions}>
          <Button label={t('tutorial.skip')} variant="ghost" onPress={skip} />
          <View style={styles.action}>
            <Button
              label={last ? t('tutorial.play') : t('tutorial.next')}
              block
              onPress={() => (last ? finish() : goTo(index + 1))}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Geste à réussir : icône et libellé, jamais la couleur seule. */
function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <View
      style={styles.check}
      accessible
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
    >
      <Icon
        icon={done ? CheckCircleIcon : CircleIcon}
        color={done ? colors.palm : colors.textMuted}
        emphasis={done}
      />
      <Text variant="labelSmall" muted={!done}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scene: { flex: 1 },
  cover: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', alignSelf: 'center' },
  pager: { flexGrow: 0 },
  card: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, minHeight: 220 },
  try: { gap: spacing.sm, marginTop: spacing.xs },
  checks: { flexDirection: 'row', gap: spacing.xl },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  // Trois par ligne : les noms longs (« Dessin dans les airs ») tiennent sur deux lignes.
  variant: { width: '30%', alignItems: 'center', gap: spacing.xs },
  footer: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.hairline },
  dotActive: { width: 24, backgroundColor: colors.text },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
