import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Scoreboard } from '@/features/game/components/scoreboard';
import { createMatch, leaders } from '@/features/game/match';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { createMatchRecord, recentlySeenWords } from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Screen, Text } from '@/ui/components';
import { Mascot } from '@/ui/mascot';
import { pop, rise, useReducedMotion } from '@/ui/motion';
import { spacing } from '@/ui/tokens';

// Séquence : mascotte, titre, puis classement (MOTION.md §3, mode équipes).
const TITLE_AT = 150;
const BOARD_AT = 450;

/** Podium final d'une partie en équipes (UX.md §3). */
export default function PlayPodiumScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const match = useGameSession((s) => s.match);
  const categories = useGameSession((s) => s.categories);
  const variant = useGameSession((s) => s.variant);
  const durationMs = useGameSession((s) => s.durationMs);
  const setMatch = useGameSession((s) => s.setMatch);
  const again = useGameSession((s) => s.again);
  const [starting, setStarting] = useState(false);

  // Une seule célébration, à l'arrivée sur l'écran.
  const arrive = useEffectEvent(() => {
    if (!match) router.replace('/play/setup');
    else feedback('record');
  });
  useEffect(() => arrive(), []);

  if (!match) return null;

  const top = leaders(match.state);
  const winner = top.length === 1 ? match.state.teams[top[0]!] : null;
  const title = winner
    ? t('teams.winner', { team: winner.name })
    : top.length > 1
      ? t('teams.tie')
      : t('teams.podiumTitle');

  /** Mêmes équipes, mêmes réglages, scores remis à zéro. */
  const playAgain = async () => {
    setStarting(true);
    try {
      const { teams, roundsPlanned } = match.state;
      const ids = categories.map((c) => c.id);
      const id = await createMatchRecord(db, {
        teams,
        roundsPlanned,
        settings: { categoryIds: ids, variant, durationS: Math.round(durationMs / 1000) },
      });
      setMatch({ id, state: createMatch(teams, roundsPlanned) });
      again({ recentlySeen: await recentlySeenWords(db, ids) });
      router.replace('/play/turn');
    } finally {
      setStarting(false);
    }
  };

  const finish = () => {
    setMatch(null);
    router.replace('/play/setup');
  };

  return (
    <Screen scroll>
      <Animated.View entering={pop({ reduced })} style={styles.mascot}>
        <Mascot state={top.length > 0 ? 'celebrate' : 'pout'} size={140} />
      </Animated.View>

      <Animated.View entering={rise({ delay: TITLE_AT, reduced })} style={styles.title}>
        <Text variant="labelSmall" muted align="center">
          {t('teams.podiumTitle')}
        </Text>
        <Text variant="display" align="center" accessibilityRole="header">
          {title}
        </Text>
      </Animated.View>

      <Animated.View entering={rise({ delay: BOARD_AT, reduced })}>
        <Scoreboard match={match.state} />
      </Animated.View>

      <Animated.View entering={rise({ delay: BOARD_AT + 150, reduced })} style={styles.actions}>
        <Button
          label={t('teams.playAgain')}
          size="lg"
          block
          loading={starting}
          onPress={() => void playAgain()}
        />
        <Button label={t('teams.finish')} variant="secondary" block onPress={finish} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mascot: { alignItems: 'center' },
  title: { gap: spacing.xs },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
