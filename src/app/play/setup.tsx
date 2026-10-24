import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useGameSession } from '@/features/game/session-store';
import { testCategories } from '@/features/game/test-categories';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { type RoundDuration, useSettings } from '@/features/settings/store';
import { Button, Card, CategoryIcon, Icon, Screen, SegmentedControl, Text } from '@/ui/components';
import { rise, staggerDelay, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

const DURATIONS: readonly RoundDuration[] = [30, 60, 90, 120];

/** Préparation : catégorie → durée → « C'est parti » (3 taps depuis l'accueil, UX.md §2). */
export default function PlaySetupScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const defaultDuration = useSettings((s) => s.defaultDuration);
  const updateSettings = useSettings((s) => s.update);
  const lastCategoryId = useGameSession((s) => s.categoryId);
  const prepare = useGameSession((s) => s.prepare);

  // La dernière catégorie jouée est présélectionnée.
  const [categoryId, setCategoryId] = useState<string | null>(lastCategoryId);
  const [duration, setDuration] = useState<RoundDuration>(defaultDuration);

  const durationOptions = useMemo(
    () => DURATIONS.map((value) => ({ value, label: t('setup.seconds', { count: value }) })),
    [t],
  );

  const start = () => {
    if (!categoryId) return;
    // La durée choisie devient la durée par défaut (variante et durée mémorisées, UX.md §3).
    updateSettings({ defaultDuration: duration });
    prepare({ categoryId, durationMs: duration * 1000 });
    router.push('/play/ready');
  };

  return (
    <Screen scroll>
      <Text variant="display" accessibilityRole="header">
        {t('screens.playSetup')}
      </Text>

      <Text variant="heading" accessibilityRole="header">
        {t('setup.category')}
      </Text>
      <View style={styles.grid}>
        {testCategories.map((category, index) => {
          const selected = category.id === categoryId;
          const name = t(`testCategories.${category.nameKey}`);
          return (
            <Animated.View
              key={category.id}
              entering={rise({ delay: staggerDelay(index) ?? 0, reduced })}
              style={[styles.gridItem, selected && styles.selected]}
              accessibilityState={{ selected }}
            >
              <Card
                accent={category.accent}
                style={styles.card}
                onPress={() => setCategoryId(category.id)}
                accessibilityLabel={name}
              >
                <View style={styles.cardTop}>
                  <CategoryIcon name={category.icon} size={40} />
                  {selected ? <Icon icon={CheckIcon} size={22} /> : null}
                </View>
                <Text variant="subheading" android_hyphenationFrequency="normal">
                  {name}
                </Text>
                <Text variant="labelSmall">
                  {t('setup.words', { count: category.cards.length })}
                </Text>
              </Card>
            </Animated.View>
          );
        })}
      </View>

      <Text variant="heading" accessibilityRole="header">
        {t('setup.duration')}
      </Text>
      <SegmentedControl
        options={durationOptions}
        value={duration}
        onChange={setDuration}
        accessibilityLabel={t('setup.duration')}
      />

      <View style={styles.variant}>
        <Text variant="labelSmall" muted>
          {t('setup.variant')}
        </Text>
        <Text variant="bodyStrong">{t('variants.classic.name')}</Text>
        <Text muted>{t('variants.classic.instruction')}</Text>
      </View>

      <Button label={t('setup.start')} size="lg" block disabled={!categoryId} onPress={start} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%', borderRadius: radii.card + 4, padding: 2 },
  // Sélection : contour blanc cassé (et coche), jamais la couleur seule.
  selected: { backgroundColor: colors.text },
  card: { minHeight: 132, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  variant: { gap: spacing.xs, marginTop: spacing.sm },
});
