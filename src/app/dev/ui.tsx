import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSettings } from '@/features/settings/store';
import { useWordFont } from '@/features/settings/use-word-font';
import { useFeedback } from '@/lib/use-feedback';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  CountText,
  Screen,
  SegmentedControl,
  Text,
} from '@/ui/components';
import {
  pop,
  rise,
  staggerDelay,
  useBreathe,
  useFlash,
  useReducedMotion,
  useShake,
} from '@/ui/motion';
import {
  type AccentColor,
  accentColors,
  colors,
  onColor,
  radii,
  spacing,
  typography,
  type TypographyRole,
  type WordFont,
} from '@/ui/tokens';

// Écran caché de validation du design system (docs/PROMPTS.md, étape 0.3).

const REGIONS = ['cm', 'africa', 'fr', 'us', 'world', 'party', 'mine'] as const;
const DURATIONS = [30, 60, 90, 120] as const;
const CATEGORY_CARDS = [
  { key: 'food', accent: 'mango', words: 120 },
  { key: 'music', accent: 'hibiscus', words: 140 },
  { key: 'football', accent: 'palm', words: 110 },
  { key: 'party', accent: 'plum', words: 90 },
  { key: 'animals', accent: 'lagoon', words: 160 },
] as const;
// Contenu de démonstration (mots du paquet d'exemple), pas des textes d'interface.
const PREVIEW_WORDS = ['Ndolé', 'Eru', 'Poulet DG', 'Koki', 'Achu'];
const SAMPLE_WORD = 'Poulet DG';
const SWATCHES: readonly AccentColor[] = [...accentColors, 'pass', 'danger'];

export default function DevUiScreen() {
  const { t } = useTranslation();
  const feedback = useFeedback();
  const reduced = useReducedMotion();
  const appReduceMotion = useSettings((s) => s.reduceMotion);
  const updateSettings = useSettings((s) => s.update);
  const wordFontSetting = useSettings((s) => s.wordFont);
  const wordFont = useWordFont();

  const [region, setRegion] = useState<(typeof REGIONS)[number]>('cm');
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(60);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [riseKey, setRiseKey] = useState(0);
  const [breathing, setBreathing] = useState(true);
  const [score, setScore] = useState(12);

  const breatheStyle = useBreathe(breathing, reduced);
  const shake = useShake(reduced);
  const flash = useFlash(reduced);

  const wordFontOptions = useMemo(
    () =>
      (['expressive', 'readable'] as const).map((value) => ({
        value,
        label: t(`devUi.word.${value}`),
      })),
    [t],
  );

  const durationOptions = useMemo(
    () => DURATIONS.map((value) => ({ value, label: t('devUi.seconds', { count: value }) })),
    [t],
  );

  return (
    <View style={styles.fill}>
      <Screen scroll>
        <Text variant="display" accessibilityRole="header">
          {t('screens.devUi')}
        </Text>
        <Text muted>{t('devUi.intro')}</Text>

        <Section title={t('devUi.sections.colors')}>
          <View style={styles.wrap}>
            {SWATCHES.map((accent) => (
              <View key={accent} style={styles.swatchItem}>
                <View style={[styles.swatch, { backgroundColor: colors[accent] }]}>
                  <Text variant="title" color={onColor(accent)}>
                    Aa
                  </Text>
                </View>
                <Text variant="caption" muted>
                  {accent}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.wrap}>
            {(['bg', 'bgElevated', 'bgSunken'] as const).map((token) => (
              <View key={token} style={styles.swatchItem}>
                <View style={[styles.swatch, styles.neutral, { backgroundColor: colors[token] }]}>
                  <Text variant="title">Aa</Text>
                </View>
                <Text variant="caption" muted>
                  {token}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title={t('devUi.sections.type')}>
          {(Object.keys(typography) as TypographyRole[]).map((variant) => (
            <View key={variant} style={styles.typeRow}>
              <Text variant="caption" muted>
                {variant}
              </Text>
              <Text variant={variant}>{t('devUi.typeSample')}</Text>
            </View>
          ))}
        </Section>

        <Section title={t('devUi.sections.buttons')}>
          <Animated.View style={[styles.start, breatheStyle]}>
            <Button label={t('devUi.buttons.play')} size="lg" onPress={() => undefined} />
          </Animated.View>
          <Button
            label={t('devUi.buttons.primary')}
            block
            loading={loading}
            onPress={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          />
          <View style={styles.row}>
            <Button
              label={t('devUi.buttons.secondary')}
              variant="secondary"
              onPress={() => undefined}
            />
            <Button label={t('devUi.buttons.ghost')} variant="ghost" onPress={() => undefined} />
          </View>
          <View style={styles.row}>
            <Button label={t('devUi.buttons.danger')} accent="danger" onPress={() => undefined} />
            <Button label={t('devUi.buttons.disabled')} disabled onPress={() => undefined} />
          </View>
        </Section>

        <Section title={t('devUi.sections.chips')}>
          <View style={styles.wrap}>
            {REGIONS.map((key) => (
              <Chip
                key={key}
                label={t(`devUi.regions.${key}`)}
                selected={region === key}
                onPress={() => setRegion(key)}
              />
            ))}
          </View>
        </Section>

        <Section title={t('devUi.sections.segmented')}>
          <SegmentedControl
            options={durationOptions}
            value={duration}
            onChange={setDuration}
            accessibilityLabel={t('devUi.durationLabel')}
          />
        </Section>

        <Section title={t('devUi.sections.word')}>
          <Card accent="mango" size="lg" style={styles.wordCard}>
            <Text
              align="center"
              style={[styles.wordSample, wordFont]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {SAMPLE_WORD}
            </Text>
            <Text variant="labelSmall" align="center">
              {t('devUi.word.instruction')}
            </Text>
          </Card>
          <SegmentedControl<WordFont>
            options={wordFontOptions}
            value={wordFontSetting}
            onChange={(value) => updateSettings({ wordFont: value })}
            accessibilityLabel={t('devUi.word.label')}
          />
        </Section>

        <Section title={t('devUi.sections.cards')}>
          <Card>
            <Text>{t('devUi.cards.plain')}</Text>
          </Card>
          <View style={styles.grid}>
            {CATEGORY_CARDS.map(({ key, accent, words }) => (
              <Card
                key={key}
                accent={accent}
                style={styles.categoryCard}
                onPress={() => undefined}
                onLongPress={() => setSheetOpen(true)}
                accessibilityLabel={t(`devUi.cards.${key}`)}
              >
                <Text variant="heading">{t(`devUi.cards.${key}`)}</Text>
                <Text variant="labelSmall">{t('devUi.cards.words', { count: words })}</Text>
              </Card>
            ))}
          </View>
          <Text variant="caption" muted>
            {t('devUi.cards.hint')}
          </Text>
        </Section>

        <Section title={t('devUi.sections.sheet')}>
          <Button
            label={t('devUi.sheet.open')}
            variant="secondary"
            onPress={() => setSheetOpen(true)}
          />
        </Section>

        <Section title={t('devUi.sections.motion')}>
          <Text variant="labelSmall" muted>
            {t('devUi.motion.reduced', {
              state: reduced ? t('devUi.motion.on') : t('devUi.motion.off'),
            })}
          </Text>
          <Button
            label={t('devUi.motion.toggleReduced')}
            variant="secondary"
            onPress={() => updateSettings({ reduceMotion: !appReduceMotion })}
          />

          <View style={styles.demoRow}>
            <Animated.View key={popKey} entering={pop({ reduced })} style={styles.badge}>
              <Text variant="title" color={colors.onSun}>
                +1
              </Text>
            </Animated.View>
            <Button
              label={t('devUi.motion.pop')}
              variant="secondary"
              onPress={() => setPopKey((k) => k + 1)}
            />
          </View>

          <View style={styles.riseList}>
            {[0, 1, 2, 3].map((i) => (
              <Animated.View
                key={`${riseKey}-${i}`}
                entering={rise({ delay: staggerDelay(i) ?? 0, reduced })}
                style={styles.riseRow}
              />
            ))}
          </View>
          <Button
            label={t('devUi.motion.rise')}
            variant="secondary"
            onPress={() => setRiseKey((k) => k + 1)}
          />

          <View style={styles.row}>
            <Chip
              label={t('devUi.motion.breathe')}
              selected={breathing}
              onPress={() => setBreathing((b) => !b)}
            />
            <Button
              label={t('devUi.motion.shake')}
              variant="secondary"
              onPress={() => feedback('error', shake.shake)}
            />
          </View>
          <Animated.View style={shake.style}>
            <Card>
              <Text variant="labelSmall" muted>
                {t('devUi.motion.score')}
              </Text>
              <CountText value={score} from={0} />
            </Card>
          </Animated.View>
          <Button
            label={t('devUi.motion.count')}
            variant="secondary"
            onPress={() => setScore(Math.floor(Math.random() * 30))}
          />

          <View style={styles.row}>
            <Button
              label={t('devUi.motion.flashFound')}
              accent="palm"
              onPress={() => feedback('found', () => flash.flash(colors.palm))}
            />
            <Button
              label={t('devUi.motion.flashPass')}
              accent="pass"
              onPress={() => feedback('pass', () => flash.flash(colors.pass))}
            />
          </View>
        </Section>

        <Section title={t('devUi.sections.feedback')}>
          <View style={styles.wrap}>
            {(['found', 'pass', 'end', 'error'] as const).map((event) => (
              <Button
                key={event}
                label={t(`devUi.feedback.${event}`)}
                variant="secondary"
                onPress={() => feedback(event)}
              />
            ))}
          </View>
        </Section>
      </Screen>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flash.style]} />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('devUi.sheet.title')}
      >
        <Text muted>{t('devUi.sheet.body')}</Text>
        <View style={styles.wrap}>
          {PREVIEW_WORDS.map((word) => (
            <View key={word} style={styles.word}>
              <Text variant="labelSmall">{word}</Text>
            </View>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  section: { gap: spacing.md, marginTop: spacing.xl },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
  swatchItem: { alignItems: 'center', gap: spacing.xs, width: 72 },
  swatch: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutral: { borderWidth: 1, borderColor: colors.hairline },
  typeRow: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  wordCard: { minHeight: 200, justifyContent: 'center' },
  wordSample: { fontSize: 56, lineHeight: 64 },
  categoryCard: { width: 156, minHeight: 120, justifyContent: 'flex-end' },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riseList: { gap: spacing.sm },
  riseRow: { height: 20, borderRadius: radii.sm, backgroundColor: colors.bgElevated },
  word: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSunken,
  },
});
