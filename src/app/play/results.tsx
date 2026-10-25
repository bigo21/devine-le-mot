import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Scoreboard } from '@/features/game/components/scoreboard';
import { score, toggleResult } from '@/features/game/engine';
import { isFinished, nextTeamIndex, recordTurn } from '@/features/game/match';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { finishMatch, recentlySeenWords, recordRound } from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import { Button, CountText, Icon, Screen, Text } from '@/ui/components';
import { motion, rise, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing, touchTarget } from '@/ui/tokens';

// Séquence de MOTION.md §3 (ms).
const SCORE_AT = 150;
const LIST_AT = 900;

export default function PlayResultsScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const round = useGameSession((s) => s.round);
  const setRound = useGameSession((s) => s.setRound);
  const again = useGameSession((s) => s.again);
  const match = useGameSession((s) => s.match);
  const recorded = useGameSession((s) => s.recorded);
  const db = useSQLiteContext();

  useEffect(() => {
    if (!round) router.replace('/play/setup');
  }, [round]);

  // Enregistrée en quittant l'écran, pour garder les corrections (une seule fois par manche).
  const record = useCallback(async () => {
    const session = useGameSession.getState();
    const { round: played, categories, variant, match: current } = session;
    if (session.recorded || !played || categories.length === 0 || played.status !== 'finished') {
      return;
    }
    session.markRecorded();
    // Mode équipes : la manche est comptée pour l'équipe dont c'était le tour.
    const teamIndex = current ? nextTeamIndex(current.state) : null;
    if (current && teamIndex !== null) {
      const state = recordTurn(current.state, score(played));
      session.setMatch({ ...current, state });
      if (isFinished(state)) void finishMatch(db, current.id).catch(() => undefined);
    }
    await recordRound(db, {
      ...(current && teamIndex !== null ? { matchId: current.id, teamIndex } : {}),
      playedAt: Date.now(),
      categoryIds: categories.map((c) => c.id),
      variant,
      durationS: Math.round(played.durationMs / 1000),
      score: score(played),
      words: played.results.map((entry) => ({
        id: entry.card.id,
        text: entry.card.text,
        result: entry.result,
      })),
    }).catch(() => undefined);
  }, [db]);

  useEffect(() => () => void record(), [record]);

  if (!round) return null;

  const results = round.results;
  const listDelay = (index: number) =>
    index < motion.resultsMaxStaggered ? LIST_AT + index * motion.resultsStagger : 0;
  const buttonsAt =
    LIST_AT + Math.min(results.length, motion.resultsMaxStaggered) * motion.resultsStagger + 100;

  const replay = async () => {
    await record();
    const { categories } = useGameSession.getState();
    if (categories.length === 0) return;
    // Mêmes réglages, mots différents : les mots vus passent en dernier (UX.md §3).
    const recentlySeen = await recentlySeenWords(
      db,
      categories.map((c) => c.id),
    );
    again({ recentlySeen });
    router.replace('/play/ready');
  };

  const nextTeam = async () => {
    await record();
    const { categories } = useGameSession.getState();
    const recentlySeen = await recentlySeenWords(
      db,
      categories.map((c) => c.id),
    );
    again({ recentlySeen });
    router.replace('/play/turn');
  };

  const seePodium = async () => {
    await record();
    router.replace('/play/podium');
  };

  // Mode équipes : tableau des scores avec la manche qui vient d'être jouée (corrections comprises).
  // Une fois enregistrée, la manche est déjà comptée dans la partie : on ne l'ajoute pas deux fois.
  const preview = match ? (recorded ? match.state : recordTurn(match.state, score(round))) : null;
  const lastTurn = preview?.turns[preview.turns.length - 1];
  const team = match && lastTurn ? match.state.teams[lastTurn.teamIndex] : null;
  const matchOver = preview ? isFinished(preview) : false;

  const changeCategory = async () => {
    await record();
    router.replace('/play/setup');
  };

  return (
    <Screen scroll>
      <Animated.View entering={rise({ reduced })}>
        <Text variant="display" accessibilityRole="header">
          {t('results.title')}
        </Text>
        {team ? (
          <View style={styles.team}>
            <View style={[styles.teamDot, { backgroundColor: colors[team.color] }]} />
            <Text variant="label">{t('teams.roundOf', { team: team.name })}</Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View entering={rise({ delay: SCORE_AT, reduced })} style={styles.score}>
        <CountText value={score(round)} from={0} delay={SCORE_AT} variant="hero" />
        <Text variant="bodyLarge" muted>
          {t('results.scoreCaption')}
        </Text>
      </Animated.View>

      {results.length === 0 ? (
        <Text muted>{t('results.empty')}</Text>
      ) : (
        <View style={styles.list}>
          <Text variant="caption" muted>
            {t('results.correctHint')}
          </Text>
          {results.map((entry, index) => {
            const found = entry.result === 'found';
            const status = found ? t('results.found') : t('results.passed');
            return (
              <Animated.View
                key={`${entry.card.id}-${index}`}
                entering={rise({ delay: listDelay(index), reduced })}
              >
                <Pressable
                  onPress={() => feedback('select', () => setRound(toggleResult(round, index)))}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.card.text}, ${status}`}
                  accessibilityHint={t('results.correctHint')}
                >
                  <Icon
                    icon={found ? CheckIcon : SkipForwardIcon}
                    color={found ? colors.palm : colors.textMuted}
                  />
                  <Text variant="bodyStrong" muted={!found} style={styles.word} numberOfLines={1}>
                    {entry.card.text}
                  </Text>
                  <Text variant="labelSmall" muted>
                    {status}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}

      {preview ? (
        <Animated.View entering={rise({ delay: buttonsAt, reduced })} style={styles.board}>
          <Text variant="heading" accessibilityRole="header">
            {t('teams.scoreboard')}
          </Text>
          <Scoreboard match={preview} highlight={lastTurn?.teamIndex ?? null} />
        </Animated.View>
      ) : null}

      <Animated.View entering={rise({ delay: buttonsAt, reduced })} style={styles.actions}>
        {preview ? (
          matchOver ? (
            <Button label={t('teams.seePodium')} size="lg" block onPress={() => void seePodium()} />
          ) : (
            <Button label={t('teams.nextTeam')} size="lg" block onPress={() => void nextTeam()} />
          )
        ) : (
          <>
            <Button label={t('results.replay')} size="lg" block onPress={() => void replay()} />
            <Button
              label={t('results.changeCategory')}
              variant="secondary"
              block
              onPress={() => void changeCategory()}
            />
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  list: { gap: spacing.xs },
  row: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  rowPressed: { backgroundColor: colors.bgElevated },
  word: { flex: 1 },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  board: { gap: spacing.md, marginTop: spacing.lg },
  team: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  teamDot: { width: 16, height: 16, borderRadius: radii.pill },
});
