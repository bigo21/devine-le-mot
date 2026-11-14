import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { isRecord, moodFor } from '@/features/game/celebration';
import { Scoreboard } from '@/features/game/components/scoreboard';
import { score, toggleResult } from '@/features/game/engine';
import { isFinished, nextTeamIndex, recordTurn } from '@/features/game/match';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import {
  bestSoloScore,
  finishMatch,
  recentlySeenWords,
  recordRound,
} from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Confetti, CountText, Icon, Screen, Text } from '@/ui/components';
import { Mascot } from '@/ui/mascot';
import { motion, pop, rise, useReducedMotion } from '@/ui/motion';
import { colors, onColor, radii, spacing, touchTarget } from '@/ui/tokens';

// Séquence de MOTION.md §3 (ms).
const SCORE_AT = 150;
const LIST_AT = 900;
/** Confettis, mascotte et badge de record (MOTION.md §3, étape 3). */
const CELEBRATE_AT = 750;

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

  // Meilleur score précédent (mêmes catégories, même durée, solo), lu avant l'enregistrement.
  // En équipes, pas de record solo : `null` d'emblée ; sinon `undefined` le temps de la lecture.
  const [previousBest, setPreviousBest] = useState<number | null | undefined>(() => {
    const { categories, match: current } = useGameSession.getState();
    return current || categories.length === 0 ? null : undefined;
  });
  useEffect(() => {
    const { categories, durationMs, match: current } = useGameSession.getState();
    if (current || categories.length === 0) return;
    let active = true;
    void bestSoloScore(
      db,
      categories.map((c) => c.id),
      Math.round(durationMs / 1000),
    ).then((best) => {
      if (active) setPreviousBest(best);
    });
    return () => {
      active = false;
    };
  }, [db]);

  // Réaction différée sur la séquence (le score défile d'abord).
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCelebrating(true), CELEBRATE_AT);
    return () => clearTimeout(timer);
  }, []);

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

  const finalScore = score(round);
  const durationS = Math.round(round.durationMs / 1000);
  const recordBeaten = previousBest !== undefined && isRecord(finalScore, previousBest);
  const mood = moodFor(finalScore, durationS, recordBeaten);

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
    <View style={styles.fill}>
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

        <Animated.View entering={rise({ delay: SCORE_AT, reduced })} style={styles.scoreRow}>
          <View style={styles.flex}>
            <View style={styles.score}>
              <CountText value={finalScore} from={0} delay={SCORE_AT} variant="hero" />
              <Text variant="bodyLarge" muted>
                {t('results.scoreCaption')}
              </Text>
            </View>
            {celebrating && recordBeaten ? (
              <RecordBadge previous={previousBest ?? 0} reduced={reduced} />
            ) : null}
          </View>
          <Mascot state={celebrating && mood !== 'neutral' ? mood : 'rest'} size={96} />
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
              <Button
                label={t('teams.seePodium')}
                size="lg"
                block
                onPress={() => void seePodium()}
              />
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
      {/* Par-dessus l'écran visible, pas dans le contenu qui défile. */}
      <Confetti fire={celebrating && mood === 'celebrate'} />
    </View>
  );
}

/** Record battu (DESIGN.md §4) : badge `sun` qui fait « pop », son de record. */
function RecordBadge({ previous, reduced }: { previous: number; reduced: boolean }) {
  const { t } = useTranslation();
  const feedback = useFeedback();
  useEffect(() => {
    feedback('record');
  }, [feedback]);
  return (
    <Animated.View
      entering={pop({ reduced })}
      style={styles.record}
      accessibilityLiveRegion="polite"
    >
      <Icon icon={TrophyIcon} color={onColor('sun')} emphasis />
      <View>
        <Text variant="label" color={onColor('sun')}>
          {t('results.record')}
        </Text>
        <Text variant="caption" color={onColor('sun')}>
          {t('results.recordPrevious', { count: previous })}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Fond explicite : évite l'aplatissement Fabric de la vue englobante (voir Mes catégories).
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.sun,
  },
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
