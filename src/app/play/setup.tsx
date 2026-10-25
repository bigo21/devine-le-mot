import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { type ComponentRef, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { VariantIcon } from '@/features/game/components/variant-icon';
import {
  cleanTeamName,
  createMatch,
  currentRound,
  MAX_TEAMS,
  MIN_TEAMS,
  nextTeamIndex,
  resizeTeams,
  type Team,
  type TeamColor,
} from '@/features/game/match';
import { useGameSession } from '@/features/game/session-store';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import {
  availableVariants,
  pickVariant,
  tooFewWordsFor,
  type VariantId,
} from '@/features/game/variants';
import { CategoryCard } from '@/features/packs/components/category-card';
import {
  type CategorySummary,
  createMatchRecord,
  finishMatch,
  getCategoryCards,
  inProgressMatch,
  listCategories,
  recentlySeenWords,
  type StoredMatch,
} from '@/features/packs/repository';
import { type RoundDuration, useSettings } from '@/features/settings/store';
import { useFeedback } from '@/lib/use-feedback';
import { Button, Icon, KeyboardScreen, SegmentedControl, Text, TextField } from '@/ui/components';
import { rise, staggerDelay, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

type Mode = 'solo' | 'teams';

const DURATIONS: readonly RoundDuration[] = [30, 60, 90, 120];
const VARIANT_CARD_WIDTH = 148;
/** Pas du carrousel (carte + espacement), pour faire défiler jusqu'à la variante choisie. */
const VARIANT_STEP = VARIANT_CARD_WIDTH + spacing.md;
const TEAM_COUNTS = Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => i + MIN_TEAMS);
const ROUND_COUNTS = [1, 2, 3, 5] as const;

/**
 * Préparation : variante → durée → catégories (une ou plusieurs, mélangées) → « C'est parti »
 * (3 taps depuis l'accueil, UX.md §2 ; variante et durée mémorisées).
 */
export default function PlaySetupScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const params = useLocalSearchParams<{ category?: string }>();
  const defaultDuration = useSettings((s) => s.defaultDuration);
  const lastVariant = useSettings((s) => s.lastVariant);
  const updateSettings = useSettings((s) => s.update);
  const lastCategories = useGameSession((s) => s.categories);
  const prepare = useGameSession((s) => s.prepare);
  const setMatch = useGameSession((s) => s.setMatch);

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  // Catégorie venue de l'écran Catégories, sinon celles de la dernière manche (UX.md §3).
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    params.category ? [Number(params.category)] : lastCategories.map((c) => c.id),
  );
  const [variantChoice, setVariantChoice] = useState<VariantId | null>(null);
  const [duration, setDuration] = useState<RoundDuration>(defaultDuration);
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState<Mode>('solo');
  const [roundsPlanned, setRoundsPlanned] = useState<number>(2);
  const teamName = useCallback(
    (color: TeamColor) => t('teams.defaultName', { color: t(`teams.colors.${color}`) }),
    [t],
  );
  const [teams, setTeams] = useState<Team[]>(() => resizeTeams([], MIN_TEAMS, teamName));
  /** Partie en équipes restée en cours (app fermée) : proposée à la reprise. */
  const [pending, setPending] = useState<StoredMatch | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listCategories(db, i18n.language).then((list) => {
        if (active) setCategories(list);
      });
      void inProgressMatch(db).then((match) => {
        if (active) setPending(match);
      });
      return () => {
        active = false;
      };
    }, [db, i18n.language]),
  );

  // Les catégories choisies au départ passent en tête : sinon elles peuvent être sélectionnées
  // tout en bas de la grille, hors de vue. Ordre figé sur le choix initial.
  const [initialIds] = useState(selectedIds);
  const ordered = useMemo(
    () => [
      ...categories.filter((c) => initialIds.includes(c.id)),
      ...categories.filter((c) => !initialIds.includes(c.id)),
    ],
    [categories, initialIds],
  );

  const selected = useMemo(
    () => categories.filter((c) => selectedIds.includes(c.id)),
    [categories, selectedIds],
  );
  const available = useMemo(() => availableVariants(selected), [selected]);
  const variant = pickVariant(variantChoice ?? lastVariant, available);
  const totalWords = selected.reduce((sum, c) => sum + c.wordCount, 0);
  const tooFew = selected.length > 0 && tooFewWordsFor(totalWords, duration);

  // La variante choisie (souvent la dernière jouée) peut être hors de vue en bout de carrousel :
  // on la ramène à l'écran, sans animation, dès que le contenu du carrousel est mesuré.
  const variantScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const variantIndex = available.indexOf(variant);
  const showSelectedVariant = () => {
    if (variantIndex <= 0) return;
    variantScroll.current?.scrollTo({
      x: Math.max(0, variantIndex - 0.3) * VARIANT_STEP,
      animated: false,
    });
  };

  const durationOptions = useMemo(
    () => DURATIONS.map((value) => ({ value, label: t('setup.seconds', { count: value }) })),
    [t],
  );

  const teamCountOptions = TEAM_COUNTS.map((value) => ({ value, label: String(value) }));
  const roundOptions = ROUND_COUNTS.map((value) => ({ value, label: String(value) }));

  const toggle = (id: number) => {
    feedback('select');
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const start = async () => {
    if (selected.length === 0) return;
    setStarting(true);
    try {
      const ids = selected.map((c) => c.id);
      const [cards, recentlySeen] = await Promise.all([
        getCategoryCards(db, ids),
        recentlySeenWords(db, ids),
      ]);
      // Variante et durée choisies deviennent celles par défaut (UX.md §3).
      updateSettings({ defaultDuration: duration, lastVariant: variant });
      prepare({
        categories: selected,
        cards,
        durationMs: duration * 1000,
        variant,
        available,
        recentlySeen,
      });
      if (mode === 'solo') {
        setMatch(null);
        router.push('/play/ready');
        return;
      }
      const named = teams.map((team) => ({
        ...team,
        name: cleanTeamName(team.name, teamName(team.color)),
      }));
      const id = await createMatchRecord(db, {
        teams: named,
        roundsPlanned,
        settings: { categoryIds: ids, variant, durationS: duration },
      });
      setMatch({ id, state: createMatch(named, roundsPlanned) });
      setPending(null);
      router.push('/play/turn');
    } finally {
      setStarting(false);
    }
  };

  /** Reprise d'une partie en équipes laissée en cours (UX.md §5, app fermée). */
  const resumeMatch = async (stored: StoredMatch) => {
    setStarting(true);
    try {
      const chosen = categories.filter((c) => stored.settings.categoryIds.includes(c.id));
      if (chosen.length === 0) {
        await finishMatch(db, stored.id);
        setPending(null);
        return;
      }
      const ids = chosen.map((c) => c.id);
      const [cards, recentlySeen] = await Promise.all([
        getCategoryCards(db, ids),
        recentlySeenWords(db, ids),
      ]);
      prepare({
        categories: chosen,
        cards,
        durationMs: stored.settings.durationS * 1000,
        variant: stored.settings.variant,
        available: availableVariants(chosen),
        recentlySeen,
      });
      setMatch({
        id: stored.id,
        state: { teams: stored.teams, roundsPlanned: stored.roundsPlanned, turns: stored.turns },
      });
      setPending(null);
      router.push('/play/turn');
    } finally {
      setStarting(false);
    }
  };

  const abandonMatch = async (stored: StoredMatch) => {
    await finishMatch(db, stored.id);
    setPending(null);
  };

  const pendingState = pending
    ? { teams: pending.teams, roundsPlanned: pending.roundsPlanned, turns: pending.turns }
    : null;
  const pendingTeam = pendingState ? nextTeamIndex(pendingState) : null;

  return (
    <View style={styles.fill}>
      <KeyboardScreen
        footer={
          <>
            {selected.length === 0 ? (
              <Text variant="labelSmall" muted>
                {t('setup.noCategory')}
              </Text>
            ) : (
              <Text variant="labelSmall" accessibilityLiveRegion="polite">
                {t('setup.selected', { count: selected.length, words: totalWords })}
              </Text>
            )}
            {tooFew ? (
              <View style={styles.warning} accessibilityLiveRegion="polite">
                <Icon icon={InfoIcon} size={18} color={colors.sun} />
                <Text variant="caption" style={styles.flex}>
                  {t('setup.tooFewWords')}
                </Text>
              </View>
            ) : null}
            <Button
              label={t('setup.start')}
              size="lg"
              block
              loading={starting}
              disabled={selected.length === 0}
              onPress={() => void start()}
            />
          </>
        }
      >
        <Text variant="display" accessibilityRole="header">
          {t('screens.playSetup')}
        </Text>

        {pending && pendingState && pendingTeam !== null ? (
          <View style={styles.resume} accessibilityLiveRegion="polite">
            <View style={styles.resumeTitle}>
              <Icon icon={UsersThreeIcon} emphasis />
              <Text variant="heading" style={styles.flex}>
                {t('teams.resumeTitle')}
              </Text>
            </View>
            <Text muted>
              {t('teams.resumeBody', {
                team: pending.teams[pendingTeam]?.name ?? '',
                round: currentRound(pendingState),
                total: pending.roundsPlanned,
              })}
            </Text>
            <Button
              label={t('teams.resume')}
              block
              loading={starting}
              onPress={() => void resumeMatch(pending)}
            />
            <Button
              label={t('teams.abandon')}
              variant="ghost"
              block
              onPress={() => void abandonMatch(pending)}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('teams.mode')}
          </Text>
          <SegmentedControl
            options={[
              { value: 'solo' as Mode, label: t('teams.solo') },
              { value: 'teams' as Mode, label: t('teams.teams') },
            ]}
            value={mode}
            onChange={setMode}
            accessibilityLabel={t('teams.mode')}
          />
          {mode === 'teams' ? (
            <>
              <Text variant="labelSmall" muted>
                {t('teams.count')}
              </Text>
              <SegmentedControl
                options={teamCountOptions}
                value={teams.length}
                onChange={(count) => setTeams((current) => resizeTeams(current, count, teamName))}
                accessibilityLabel={t('teams.count')}
              />
              <Text variant="labelSmall" muted>
                {t('teams.rounds')}
              </Text>
              <SegmentedControl
                options={roundOptions}
                value={roundsPlanned}
                onChange={setRoundsPlanned}
                accessibilityLabel={t('teams.rounds')}
              />
              <Text variant="labelSmall" muted>
                {t('teams.names')}
              </Text>
              {teams.map((team, index) => (
                <View key={team.color} style={styles.teamRow}>
                  <View style={[styles.teamDot, { backgroundColor: colors[team.color] }]} />
                  <TextField
                    value={team.name}
                    onChangeText={(name) =>
                      setTeams((current) =>
                        current.map((t2, i) => (i === index ? { ...t2, name } : t2)),
                      )
                    }
                    placeholder={teamName(team.color)}
                    accessibilityLabel={t('teams.nameLabel', { index: index + 1 })}
                    maxLength={24}
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('setup.variant')}
          </Text>
          <ScrollView
            ref={variantScroll}
            onContentSizeChange={showSelectedVariant}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.variants}
            accessibilityHint={t('setup.variantsHint')}
          >
            {available.map((id) => {
              const isSelected = id === variant;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    feedback('select');
                    setVariantChoice(id);
                  }}
                  style={[styles.variantCard, isSelected && styles.variantSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(`variants.${id}.name`)}. ${t(`variants.${id}.instruction`)}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <VariantIcon variant={id} size={52} active={isSelected} />
                  {/* Une ligne, réduite si besoin : jamais de coupure au milieu d'un mot. */}
                  <Text
                    variant="label"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {t(`variants.${id}.name`)}
                  </Text>
                  <Text variant="caption" muted numberOfLines={3}>
                    {t(`variants.${id}.instruction`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('setup.duration')}
          </Text>
          <SegmentedControl
            options={durationOptions}
            value={duration}
            onChange={setDuration}
            accessibilityLabel={t('setup.duration')}
          />
        </View>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {t('setup.category')}
          </Text>
          <Text variant="caption" muted>
            {t('setup.categoryHint')}
          </Text>
          <View style={styles.grid} collapsable={false}>
            {ordered.map((category, index) => {
              const isSelected = selectedIds.includes(category.id);
              return (
                <Animated.View
                  key={category.id}
                  entering={rise({ delay: staggerDelay(index) ?? 0, reduced })}
                  style={[styles.gridItem, isSelected && styles.selected]}
                  accessibilityState={{ selected: isSelected }}
                >
                  <CategoryCard
                    category={category}
                    selected={isSelected}
                    onPress={() => toggle(category.id)}
                  />
                </Animated.View>
              );
            })}
          </View>
        </View>
      </KeyboardScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond explicite : une vue sans propriété visuelle est aplatie par Fabric (voir Mes catégories).
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  section: { gap: spacing.md },
  // Le carrousel déborde volontairement des marges pour défiler jusqu'au bord.
  bleed: { marginHorizontal: -spacing.xl },
  variants: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  variantCard: {
    width: VARIANT_CARD_WIDTH,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: colors.hairline,
  },
  // Sélection : contour blanc cassé (et icône animée), jamais la couleur seule.
  variantSelected: { borderColor: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%', borderRadius: radii.card + 4, padding: 2 },
  selected: { backgroundColor: colors.text },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamDot: { width: 24, height: 24, borderRadius: radii.pill },
  resume: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: colors.hibiscus,
  },
  resumeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warning: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
