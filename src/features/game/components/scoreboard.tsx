import { CrownIcon } from 'phosphor-react-native/src/icons/Crown';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Icon, Text } from '@/ui/components';
import { pop, spring, useReducedMotion } from '@/ui/motion';
import { colors, onColor, radii, spacing, touchTarget } from '@/ui/tokens';

import { leaders, type MatchState, standings } from '../match';

/** Réordonnancement des lignes : ressort doux (MOTION.md §3, mode équipes). */
const reorder = LinearTransition.springify()
  .damping(spring.gentle.damping)
  .stiffness(spring.gentle.stiffness);

type Props = {
  match: MatchState;
  /** Équipe mise en avant (celle qui vient de jouer, ou qui va jouer). */
  highlight?: number | null;
};

/**
 * Tableau des scores animé : les positions se réordonnent avec un ressort, l'équipe en tête reçoit
 * une couronne (`pop`). Rang et points écrits en toutes lettres, jamais la couleur seule.
 */
export function Scoreboard({ match, highlight = null }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const top = leaders(match);

  return (
    <View style={styles.list} accessibilityRole="list" accessibilityLabel={t('teams.scoreboard')}>
      {standings(match).map((row) => {
        const leading = top.includes(row.teamIndex);
        const label = `${row.rank === 1 ? t('teams.rankFirst') : t('teams.rank', { rank: row.rank })}, ${row.team.name}, ${t('teams.points', { count: row.total })}${leading ? `, ${t('teams.leader')}` : ''}`;
        return (
          <Animated.View
            key={row.teamIndex}
            layout={reduced ? undefined : reorder}
            style={[styles.row, highlight === row.teamIndex && styles.highlight]}
            accessible
            accessibilityLabel={label}
          >
            <Text variant="label" muted style={styles.rank}>
              {row.rank === 1 ? t('teams.rankFirst') : t('teams.rank', { rank: row.rank })}
            </Text>
            <View style={[styles.dot, { backgroundColor: colors[row.team.color] }]}>
              {leading ? (
                <Animated.View key={`crown-${row.total}`} entering={pop({ reduced })}>
                  <Icon icon={CrownIcon} size={18} color={onColor(row.team.color)} emphasis />
                </Animated.View>
              ) : null}
            </View>
            <Text variant="bodyStrong" style={styles.name} numberOfLines={1}>
              {row.team.name}
            </Text>
            <Text variant="title">{row.total}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    minHeight: touchTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  highlight: { borderColor: colors.text },
  rank: { width: 32 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
});
