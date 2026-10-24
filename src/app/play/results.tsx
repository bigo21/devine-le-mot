import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { score, toggleResult } from '@/features/game/engine';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
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
  const categoryId = useGameSession((s) => s.categoryId);
  const durationMs = useGameSession((s) => s.durationMs);
  const setRound = useGameSession((s) => s.setRound);
  const prepare = useGameSession((s) => s.prepare);

  useEffect(() => {
    if (!round) router.replace('/play/setup');
  }, [round]);

  if (!round) return null;

  const results = round.results;
  const listDelay = (index: number) =>
    index < motion.resultsMaxStaggered ? LIST_AT + index * motion.resultsStagger : 0;
  const buttonsAt =
    LIST_AT + Math.min(results.length, motion.resultsMaxStaggered) * motion.resultsStagger + 100;

  const replay = () => {
    if (!categoryId) return;
    prepare({ categoryId, durationMs });
    router.replace('/play/ready');
  };

  return (
    <Screen scroll>
      <Animated.View entering={rise({ reduced })}>
        <Text variant="display" accessibilityRole="header">
          {t('results.title')}
        </Text>
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

      <Animated.View entering={rise({ delay: buttonsAt, reduced })} style={styles.actions}>
        <Button label={t('results.replay')} size="lg" block onPress={replay} />
        <Button
          label={t('results.changeCategory')}
          variant="secondary"
          block
          onPress={() => router.replace('/play/setup')}
        />
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
});
