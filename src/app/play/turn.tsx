import { router } from 'expo-router';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Scoreboard } from '@/features/game/components/scoreboard';
import { currentRound, nextTeamIndex } from '@/features/game/match';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { Button, Icon, Screen, Text } from '@/ui/components';
import { pop, rise, spring, timing, useReducedMotion } from '@/ui/motion';
import { colors, onColor, radii, spacing } from '@/ui/tokens';

/** Délai d'apparition du nom, après le passage du bandeau (MOTION.md §3, mode équipes). */
const NAME_AT = 180;

/**
 * Écran de passage « Au tour de Équipe X » (UX.md §3) : le mot n'est jamais visible ici. Le
 * bandeau de la couleur de l'équipe balaie l'écran de gauche à droite, puis le nom fait « pop ».
 */
export default function PlayTurnScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const match = useGameSession((s) => s.match);
  const round = useGameSession((s) => s.round);

  const teamIndex = match ? nextTeamIndex(match.state) : null;
  const team = teamIndex !== null && match ? match.state.teams[teamIndex] : null;

  const sweep = useSharedValue(reduced ? 0 : -width);
  const fade = useSharedValue(reduced ? 0 : 1);
  useEffect(() => {
    if (reduced) fade.set(withTiming(1, timing.fast));
    else sweep.set(withSpring(0, spring.gentle));
  }, [fade, reduced, sweep]);
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: sweep.get() }],
  }));

  useEffect(() => {
    if (!match || !round || !team) router.replace('/play/setup');
  }, [match, round, team]);

  if (!match || !team) return null;

  const played = match.state.turns.length > 0;

  return (
    <Screen scroll>
      <Animated.View
        style={[styles.banner, { backgroundColor: colors[team.color] }, bannerStyle]}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${t('teams.turnTitle')} ${team.name}`}
      >
        <Text variant="labelSmall" color={onColor(team.color)}>
          {t('teams.turnTitle')}
        </Text>
        <Animated.View entering={pop({ delay: NAME_AT, reduced })}>
          <Text variant="hero" color={onColor(team.color)} numberOfLines={2} adjustsFontSizeToFit>
            {team.name}
          </Text>
        </Animated.View>
        <Text variant="label" color={onColor(team.color)}>
          {t('teams.turnRound', {
            round: currentRound(match.state),
            total: match.state.roundsPlanned,
          })}
        </Text>
      </Animated.View>

      <Animated.View entering={rise({ delay: NAME_AT * 2, reduced })}>
        <Text muted>{t('teams.turnHint')}</Text>
      </Animated.View>

      <Animated.View entering={rise({ delay: NAME_AT * 2 + 80, reduced })}>
        <Button
          label={t('teams.turnStart')}
          size="lg"
          block
          icon={<Icon icon={PlayIcon} emphasis />}
          onPress={() => router.replace('/play/ready')}
        />
      </Animated.View>

      {played ? (
        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('teams.scoreboard')}
          </Text>
          <Scoreboard match={match.state} highlight={teamIndex} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { gap: spacing.sm, padding: spacing.xl, borderRadius: radii.lg },
  section: { gap: spacing.md, marginTop: spacing.lg },
});
