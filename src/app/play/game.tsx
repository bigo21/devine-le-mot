import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { TimerRing } from '@/features/game/components/timer-ring';
import {
  answer as answerCard,
  type Card,
  type CardResult,
  currentCard,
  pause,
  remainingMs,
  resume,
  type RoundState,
  score,
  startRound,
  tick,
} from '@/features/game/engine';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { useTilt } from '@/features/game/use-tilt';
import { useSettings } from '@/features/settings/store';
import { useWordFont } from '@/features/settings/use-word-font';
import { useFeedback } from '@/lib/use-feedback';
import { BottomSheet, Button, Icon, SurfaceContext, Text } from '@/ui/components';
import {
  easing,
  fadeOut,
  motion,
  pop,
  spring,
  timing,
  useFlash,
  useReducedMotion,
} from '@/ui/motion';
import { colors, onColor, spacing } from '@/ui/tokens';

type Phase = 'countdown' | 'playing' | 'paused' | 'ended';

const COUNTDOWN_STEP_MS = 1000;
const GO_MS = 600;
const CLOCK_MS = 200;
const DANGER_SECONDS = 10;
const END_TO_RESULTS_MS = 1400;
const RESHUFFLE_TOAST_MS = 2200;
/** Déplacement du mot qui sort (trouvé : vers le bas ; passer : vers le haut). */
const WORD_EXIT_Y = 120;
const WORD_ENTER_Y = -40;

const getRound = () => useGameSession.getState().round;

export default function PlayGameScreen() {
  useOrientationLock('landscape');
  useKeepAwake();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const wordFont = useWordFont();
  const tapMode = useSettings((s) => s.tapMode);
  const round = useGameSession((s) => s.round);
  const category = useGameSession((s) => s.category);
  const cards = useGameSession((s) => s.cards);
  const durationMs = useGameSession((s) => s.durationMs);
  const setRound = useGameSession((s) => s.setRound);
  const prepare = useGameSession((s) => s.prepare);

  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState<number | 'go'>(3);
  const [displayed, setDisplayed] = useState<Card | null>(null);
  const [danger, setDanger] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reshuffled, setReshuffled] = useState(false);
  /** Confirmation au centre (icône + libellé) : jamais la couleur seule (DESIGN.md §7). */
  // Le libellé suit l'opacité du flash : ils apparaissent et disparaissent ensemble.
  const [burst, setBurst] = useState<CardResult | null>(null);
  const busy = useRef(false);
  const lastSecond = useRef<number | null>(null);

  const progress = useSharedValue(1);
  const pulse = useSharedValue(0);
  const wordY = useSharedValue(0);
  const wordScale = useSharedValue(1);
  const wordOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const endFade = useSharedValue(0);
  const flash = useFlash(reduced);

  useEffect(() => {
    if (!round || !category) router.replace('/play/setup');
  }, [round, category]);

  // --- Minuteur -----------------------------------------------------------------------------

  const runRing = useCallback(
    (state: RoundState, now: number) => {
      const remaining = remainingMs(state, now);
      progress.set(remaining / state.durationMs);
      progress.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
    },
    [progress],
  );

  const endRound = useCallback(() => {
    setPhase('ended');
    cancelAnimation(progress);
    progress.set(0);
    feedback('end');
    endFade.set(reduced ? withTiming(1, timing.fast) : withTiming(1, { duration: 600 }));
    setTimeout(() => router.replace('/play/results'), END_TO_RESULTS_MS);
  }, [endFade, feedback, progress, reduced]);

  // --- Mots ---------------------------------------------------------------------------------

  const showCard = useCallback(
    (card: Card | null) => {
      setDisplayed(card);
      if (reduced) {
        wordY.set(0);
        wordScale.set(1);
        wordOpacity.set(withTiming(1, timing.fast));
      } else {
        wordY.set(WORD_ENTER_Y);
        wordScale.set(0.92);
        wordOpacity.set(0);
        wordY.set(withSpring(0, spring.bouncy));
        wordScale.set(withSpring(1, spring.bouncy));
        wordOpacity.set(withTiming(1, timing.fast));
      }
      busy.current = false;
    },
    [reduced, wordOpacity, wordScale, wordY],
  );

  const advance = useCallback(
    (result: CardResult, at: number) => {
      const state = getRound();
      if (!state) return;
      const next = answerCard(state, result, at, Math.random);
      setRound(next);
      if (next.status === 'finished') {
        endRound();
        return;
      }
      if (next.reshuffles > state.reshuffles) {
        setReshuffled(true);
        setTimeout(() => setReshuffled(false), RESHUFFLE_TOAST_MS);
      }
      showCard(currentCard(next));
    },
    [endRound, setRound, showCard],
  );

  const onAnswer = useCallback(
    (result: CardResult) => {
      if (phase !== 'playing' || busy.current || sheetOpen) return;
      busy.current = true;
      const at = Date.now();
      const found = result === 'found';
      setBurst(result);
      feedback(found ? 'found' : 'pass', () => flash.flash(found ? colors.palm : colors.pass));
      if (found) {
        scoreScale.set(
          withSequence(
            withTiming(1.3, { duration: 110, easing: easing.out }),
            withSpring(1, spring.bouncy),
          ),
        );
      }
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(advance, result, at);
      };
      const exit = { duration: motion.wordExit, easing: easing.out };
      if (!reduced) {
        wordY.set(withTiming(found ? WORD_EXIT_Y : -WORD_EXIT_Y, exit));
        if (found) wordScale.set(withTiming(0.8, exit));
      }
      wordOpacity.set(withTiming(0, exit, done));
    },
    [
      advance,
      feedback,
      flash,
      phase,
      reduced,
      scoreScale,
      sheetOpen,
      wordOpacity,
      wordScale,
      wordY,
    ],
  );

  const tilt = useTilt({
    // Pendant le compte à rebours, la détection se recalibre (téléphone déjà sur le front).
    enabled: (phase === 'countdown' || phase === 'playing') && !tapMode && !sheetOpen,
    onEvent: (event) => {
      if (event.type === 'correct') onAnswer('found');
      else if (event.type === 'pass') onAnswer('passed');
    },
  });

  // --- Compte à rebours 3-2-1 ---------------------------------------------------------------

  const beginPlay = useCallback(() => {
    const state = getRound();
    if (!state) return;
    const now = Date.now();
    const next =
      state.status === 'ready'
        ? startRound(state, now)
        : state.status === 'paused'
          ? resume(state, now)
          : state;
    setRound(next);
    runRing(next, now);
    setPhase('playing');
    showCard(currentCard(next));
  }, [runRing, setRound, showCard]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const timers = [3, 2, 1].map((n, i) =>
      setTimeout(() => {
        setCount(n);
        feedback('countdown');
      }, i * COUNTDOWN_STEP_MS),
    );
    timers.push(
      setTimeout(() => {
        setCount('go');
        feedback('start');
      }, 3 * COUNTDOWN_STEP_MS),
      setTimeout(beginPlay, 3 * COUNTDOWN_STEP_MS + GO_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, beginPlay, feedback]);

  // --- Horloge : fin de manche et 10 dernières secondes -------------------------------------

  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      const state = getRound();
      if (!state) return;
      const now = Date.now();
      const next = tick(state, now);
      if (next.status === 'finished') {
        setRound(next);
        endRound();
        return;
      }
      const seconds = Math.ceil(remainingMs(next, now) / 1000);
      if (seconds <= DANGER_SECONDS && seconds !== lastSecond.current) {
        lastSecond.current = seconds;
        setDanger(true);
        feedback('tick');
        if (!reduced) {
          pulse.set(
            withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 250 })),
          );
        }
      }
    }, CLOCK_MS);
    return () => clearInterval(interval);
  }, [phase, endRound, feedback, pulse, reduced, setRound]);

  // --- Pause : retour arrière, appel, app en arrière-plan (UX.md §5) ------------------------

  const pauseGame = useCallback(() => {
    if (phase !== 'playing' && phase !== 'countdown') return;
    const state = getRound();
    if (state?.status === 'playing') setRound(pause(state, Date.now()));
    cancelAnimation(progress);
    setPhase('paused');
    setSheetOpen(true);
  }, [phase, progress, setRound]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (phase === 'ended') return true;
        pauseGame();
        return true;
      });
      return () => subscription.remove();
    }, [pauseGame, phase]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') pauseGame();
    });
    return () => subscription.remove();
  }, [pauseGame]);

  const resumeGame = () => {
    setSheetOpen(false);
    tilt.recalibrate();
    setPhase('countdown');
  };

  const restartGame = () => {
    if (!category) return;
    // Nouveau tirage sur les mêmes mots (les mots de la manche abandonnée passent en dernier).
    prepare({ category, cards, durationMs });
    setDisplayed(null);
    setDanger(false);
    lastSecond.current = null;
    cancelAnimation(progress);
    progress.set(1);
    wordOpacity.set(0);
    setSheetOpen(false);
    tilt.recalibrate();
    setPhase('countdown');
  };

  const quitGame = () => {
    setSheetOpen(false);
    router.replace('/play/setup');
  };

  // --- Styles animés ------------------------------------------------------------------------

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.get(),
    transform: [{ translateY: wordY.get() }, { scale: wordScale.get() }],
  }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.get() }] }));
  const endStyle = useAnimatedStyle(() => ({ opacity: endFade.get() }));
  // Même courbe que le flash ; léger « pop » (0,85 → 1) en mode normal.
  const burstStyle = useAnimatedStyle(() => {
    const visible = Math.min(1, flash.opacity.get() / motion.flashPeak);
    return {
      opacity: visible,
      transform: [{ scale: reduced ? 1 : 0.85 + 0.15 * visible }],
    };
  });

  if (!round || !category) return null;

  const background = colors[category.color];
  const foreground = onColor(category.color);
  const found = score(round);

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar hidden />
      <TimerRing progress={progress} danger={danger} pulse={pulse} foreground={foreground} />

      <SurfaceContext value={{ foreground, muted: foreground }}>
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              paddingLeft: insets.left + spacing.xxl,
              paddingRight: insets.right + spacing.xxl,
            },
          ]}
        >
          <Animated.View
            style={[styles.score, scoreStyle]}
            accessible
            accessibilityLabel={t('game.scoreLabel', { count: found })}
          >
            <Icon icon={CheckIcon} size={22} />
            <Text variant="title">{found}</Text>
          </Animated.View>

          {phase === 'countdown' ? (
            <Animated.View key={String(count)} entering={pop({ reduced })} exiting={fadeOut}>
              <Text variant="hero" style={styles.countdown} accessibilityLiveRegion="polite">
                {count === 'go' ? t('game.go') : count}
              </Text>
            </Animated.View>
          ) : null}

          {phase === 'playing' || phase === 'paused' ? (
            <Animated.View style={[styles.wordBox, wordStyle]}>
              <Text
                align="center"
                style={[styles.word, wordFont]}
                adjustsFontSizeToFit
                minimumFontScale={0.2}
                numberOfLines={2}
                maxFontSizeMultiplier={1}
              >
                {displayed?.text ?? ''}
              </Text>
              <Text variant="bodyLarge" align="center">
                {t('variants.classic.instruction')}
              </Text>
            </Animated.View>
          ) : null}

          {reshuffled ? (
            <Animated.View entering={pop({ reduced })} exiting={fadeOut} style={styles.toast}>
              <Text variant="labelSmall" color={colors.text}>
                {t('game.reshuffled')}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {tapMode && phase === 'playing' ? (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.halves}>
              <TapHalf
                label={t('game.pass')}
                icon={<Icon icon={SkipForwardIcon} size={24} />}
                onPress={() => onAnswer('passed')}
                inset={insets.left}
                side="left"
              />
              <TapHalf
                label={t('game.found')}
                icon={<Icon icon={CheckIcon} size={24} />}
                onPress={() => onAnswer('found')}
                inset={insets.right}
                side="right"
              />
            </View>
          </View>
        ) : null}
      </SurfaceContext>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flash.style]} />

      {burst ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.burstWrap]}>
          <Animated.View style={[styles.burst, burstStyle]}>
            <Icon
              icon={burst === 'found' ? CheckIcon : SkipForwardIcon}
              size={88}
              color={burst === 'found' ? colors.onPalm : colors.onPass}
            />
            <Text variant="hero" color={burst === 'found' ? colors.onPalm : colors.onPass}>
              {burst === 'found' ? t('game.found') : t('game.passed')}
            </Text>
          </Animated.View>
        </View>
      ) : null}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.end, endStyle]}>
        {phase === 'ended' ? (
          <Animated.View entering={pop({ reduced })}>
            <Text variant="hero" color={colors.text} accessibilityLiveRegion="polite">
              {t('game.timeUp')}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      <BottomSheet visible={sheetOpen} onClose={resumeGame} title={t('pause.title')}>
        <Button label={t('pause.resume')} size="lg" block onPress={resumeGame} />
        <Button label={t('pause.restart')} variant="secondary" block onPress={restartGame} />
        <Button label={t('pause.quit')} variant="ghost" block onPress={quitGame} />
      </BottomSheet>
    </View>
  );
}

type TapHalfProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  inset: number;
  side: 'left' | 'right';
};

/** Moitié d'écran du mode tap : libellé et icône toujours visibles (GAMEPLAY.md §1). */
function TapHalf({ label, icon, onPress, inset, side }: TapHalfProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.half, pressed && styles.halfPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.halfLabel,
          side === 'left' ? { left: inset + spacing.xl } : { right: inset + spacing.xl },
        ]}
      >
        {icon}
        <Text variant="label">{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  score: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countdown: { fontSize: 120, lineHeight: 132 },
  wordBox: { width: '80%', alignItems: 'center', gap: spacing.md },
  word: { width: '100%', fontSize: 120, lineHeight: 132 },
  toast: {
    position: 'absolute',
    bottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.bg,
  },
  halves: { flex: 1, flexDirection: 'row' },
  half: { flex: 1 },
  halfPressed: { backgroundColor: colors.hairline },
  halfLabel: {
    position: 'absolute',
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: 0.85,
  },
  burstWrap: { alignItems: 'center', justifyContent: 'center' },
  burst: { alignItems: 'center', gap: spacing.sm },
  end: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
