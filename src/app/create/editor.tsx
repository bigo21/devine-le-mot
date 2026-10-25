import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClipboardTextIcon } from 'phosphor-react-native/src/icons/ClipboardText';
import { CopySimpleIcon } from 'phosphor-react-native/src/icons/CopySimple';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, type TextInput, View } from 'react-native';

import { emojiIcons } from '@/assets/categories';
import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { CategoryCard } from '@/features/packs/components/category-card';
import {
  addWords,
  type CategoryDraft,
  cleanForbidden,
  draftStatus,
  editorLimits,
  emptyDraft,
} from '@/features/packs/editor';
import { useEditorHandoff } from '@/features/packs/editor-handoff';
import {
  type CategorySummary,
  getEditableCategory,
  saveUserCategory,
} from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import {
  BottomSheet,
  Button,
  CategoryIcon,
  Icon,
  KeyboardScreen,
  Screen,
  Text,
  TextField,
} from '@/ui/components';
import {
  categoryColors,
  colors,
  onColor,
  radii,
  spacing,
  touchTarget,
} from '@/ui/tokens';

/** Icônes proposées : celles qui ont une image Fluent 3D (pas d'emoji système, ASSETS.md §3). */
const DEFAULT_EMOJI = '🎉';
/** Icônes proposées, celle par défaut en tête pour qu'elle soit visible comme sélectionnée. */
const EMOJIS = [DEFAULT_EMOJI, ...Object.keys(emojiIcons).filter((e) => e !== DEFAULT_EMOJI)];
const FORBIDDEN_FIELDS = editorLimits.minForbidden;
/** Mots affichés d'un coup (une catégorie importée peut en compter 5 000) : ouverture rapide. */
const WORDS_PAGE = 20;
const EMOJI_SIZE = 56;
/** Largeur d'une icône de la rangée, espacement compris (liste virtualisée). */
const EMOJI_STEP = EMOJI_SIZE + spacing.sm;

type LeaveAction = Parameters<NonNullable<Parameters<typeof usePreventRemove>[1]>>[0]['data']['action'];

/** Éditeur de catégorie (GAMEPLAY.md §5, DESIGN.md §4) : création, modification, duplication. */
export default function EditorScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const feedback = useFeedback();
  const params = useLocalSearchParams<{ id?: string; duplicate?: string; from?: string }>();
  const editingId = params.id ? Number(params.id) : undefined;
  const duplicateId = params.duplicate ? Number(params.duplicate) : undefined;

  // Liste collée à l'import : lue une fois à l'ouverture (vidée juste après, voir l'effet).
  const [draft, setDraft] = useState<CategoryDraft>(() => {
    const base = emptyDraft(DEFAULT_EMOJI, 'lagoon');
    const handed = params.from === 'paste' ? useEditorHandoff.getState().text : null;
    return handed ? { ...base, words: addWords([], handed).words } : base;
  });
  const [loading, setLoading] = useState(editingId !== undefined || duplicateId !== undefined);
  const [readOnly, setReadOnly] = useState(false);
  const [dirty, setDirty] = useState(params.from === 'paste');
  const [entry, setEntry] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [leave, setLeave] = useState<LeaveAction | null>(null);
  const [visibleWords, setVisibleWords] = useState(WORDS_PAGE);
  const entryRef = useRef<ComponentRef<typeof TextInput>>(null);
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  const forbiddenRefs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const leaving = useRef(false);

  useEffect(() => {
    if (params.from === 'paste') useEditorHandoff.getState().take();
  }, [params.from]);

  useEffect(() => {
    const sourceId = editingId ?? duplicateId;
    if (sourceId === undefined) return;
    let active = true;
    void getEditableCategory(db, sourceId).then((found) => {
      if (!active) return;
      setLoading(false);
      if (!found) return;
      if (duplicateId !== undefined) {
        const name = `${found.draft.name} ${t('editor.copySuffix')}`;
        setDraft({ ...found.draft, name: name.slice(0, editorLimits.maxNameLength) });
        setDirty(true);
      } else {
        setDraft(found.draft);
        setReadOnly(found.source === 'builtin');
      }
    });
    return () => {
      active = false;
    };
  }, [db, editingId, duplicateId, t]);

  // Après un enregistrement, `dirty` n'est pas encore à jour quand on navigue : la ref tranche.
  usePreventRemove(dirty, ({ data }) => {
    if (leaving.current) navigation.dispatch(data.action);
    else setLeave(data.action);
  });

  // Icône choisie hors écran (modification, duplication) : la rangée s'ouvre sur elle.
  const selectedEmojiIndex = EMOJIS.indexOf(draft.emoji.replace(/️/g, ''));

  const status = draftStatus(draft);
  const shownWords = useMemo(() => [...draft.words].reverse(), [draft.words]);
  const preview: CategorySummary = {
    id: -1,
    name: draft.name.trim() || t('editor.previewName'),
    emoji: draft.emoji,
    color: draft.color,
    region: 'custom',
    source: 'user',
    wordCount: draft.words.length,
    favorite: false,
    tags: [],
  };

  const update = (patch: Partial<CategoryDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setSaveError(false);
  };

  const describeAdd = (result: ReturnType<typeof addWords>['result']) => {
    if (result.words.length === 0 && result.tooLong.length === 0) return t('editor.nothingAdded');
    return [
      result.words.length > 0 ? t('editor.added', { count: result.words.length }) : null,
      result.duplicates > 0 ? t('editor.duplicates', { count: result.duplicates }) : null,
      result.tooLong.length > 0
        ? t('editor.tooLong', { count: result.tooLong.length, max: editorLimits.maxWordLength })
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  // À la validation, l'état peut ne pas avoir reçu les dernières lettres (saisie rapide) : on
  // préfère le texte transmis par l'événement.
  const addEntry = (submitted?: string) => {
    const text = submitted ?? entry;
    if (!text.trim()) return;
    const next = addWords(draft.words, text);
    update({ words: next.words });
    setReport(describeAdd(next.result));
    setEntry('');
    if (next.result.words.length > 0) feedback('select');
    entryRef.current?.focus();
  };

  const addPaste = () => {
    const next = addWords(draft.words, paste);
    update({ words: next.words });
    setReport(describeAdd(next.result));
    if (next.result.words.length > 0) {
      feedback('select');
      setPaste('');
      setPasteOpen(false);
    }
  };

  const removeWord = (text: string) => {
    update({ words: draft.words.filter((w) => w.text !== text) });
    if (expanded === text) setExpanded(null);
  };

  const setForbidden = (text: string, index: number, value: string) => {
    update({
      words: draft.words.map((w) => {
        if (w.text !== text) return w;
        const forbidden = [...w.forbidden];
        while (forbidden.length <= index) forbidden.push('');
        forbidden[index] = value;
        return { ...w, forbidden };
      }),
    });
  };

  const save = async (andPlay: boolean) => {
    if (!status.canSave) {
      setShowErrors(true);
      feedback('error');
      if (status.nameMissing) nameRef.current?.focus();
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      const id = await saveUserCategory(
        db,
        draft,
        editingId !== undefined ? { categoryId: editingId } : { duplicatedFrom: duplicateId },
      );
      leaving.current = true;
      setDirty(false);
      if (andPlay) {
        router.replace({ pathname: '/play/setup', params: { category: String(id) } });
      } else {
        router.back();
      }
    } catch {
      setSaveError(true);
      feedback('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen>{null}</Screen>;

  if (readOnly && editingId !== undefined) {
    return (
      <Screen>
        <Text variant="display" accessibilityRole="header">
          {draft.name}
        </Text>
        <Text muted>{t('editor.readOnly')}</Text>
        <Button
          label={t('editor.duplicate')}
          block
          icon={<Icon icon={CopySimpleIcon} />}
          onPress={() =>
            router.replace({
              pathname: '/create/editor',
              params: { duplicate: String(editingId) },
            })
          }
        />
      </Screen>
    );
  }

  const wordStatus = status.tooFewWords
    ? {
        icon: WarningIcon,
        text: t('editor.needMore', { count: editorLimits.minWords - status.wordCount }),
      }
    : status.fewWords
      ? { icon: InfoIcon, text: t('editor.fewWords') }
      : { icon: CheckCircleIcon, text: t('editor.enough') };

  return (
    <View style={styles.fill}>
      <KeyboardScreen
        footer={
          <>
            {saveError ? (
              <Text variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
                {t('editor.saveFailed')}
              </Text>
            ) : null}
            <Button
              label={t('editor.saveAndPlay')}
              size="lg"
              block
              loading={saving}
              icon={<Icon icon={PlayIcon} emphasis />}
              onPress={() => void save(true)}
            />
            <Button
              label={t('editor.save')}
              variant="secondary"
              block
              disabled={saving}
              onPress={() => void save(false)}
            />
          </>
        }
      >
        <Text variant="display" accessibilityRole="header">
          {editingId !== undefined ? t('editor.editTitle') : t('editor.createTitle')}
        </Text>

        {/* Aperçu en temps réel de la carte (DESIGN.md §4), décoratif. */}
        <View
          style={styles.preview}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.previewCard}>
            <CategoryCard category={preview} onPress={() => undefined} />
          </View>
        </View>

        <TextField
          ref={nameRef}
          label={t('editor.name')}
          placeholder={t('editor.namePlaceholder')}
          value={draft.name}
          onChangeText={(name) => update({ name })}
          maxLength={editorLimits.maxNameLength}
          autoCapitalize="sentences"
          returnKeyType="next"
          error={showErrors && status.nameMissing ? t('editor.nameMissing') : undefined}
        />

        <TextField
          label={t('editor.description')}
          placeholder={t('editor.descriptionPlaceholder')}
          value={draft.description}
          onChangeText={(description) => update({ description })}
          maxLength={editorLimits.maxDescriptionLength}
          autoCapitalize="sentences"
        />

        <View style={styles.section}>
          <Text variant="labelSmall" muted>
            {t('editor.icon')}
          </Text>
          {/* Liste virtualisée : seules les icônes visibles sont créées (une image chacune). */}
          <FlatList
            horizontal
            data={EMOJIS}
            keyExtractor={(emoji) => emoji}
            extraData={draft.emoji}
            initialScrollIndex={Math.max(0, selectedEmojiIndex - 1)}
            getItemLayout={(_, index) => ({
              length: EMOJI_STEP,
              offset: EMOJI_STEP * index,
              index,
            })}
            initialNumToRender={8}
            windowSize={3}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.emojis}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: emoji }) => {
              const selected = emoji === draft.emoji.replace(/️/g, '');
              return (
                <Pressable
                  onPress={() => {
                    feedback('select');
                    update({ emoji });
                  }}
                  style={[styles.emoji, selected && styles.emojiSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={t('editor.iconLabel', { emoji })}
                  accessibilityState={{ selected }}
                >
                  <CategoryIcon emoji={emoji} size={36} />
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.section}>
          <Text variant="labelSmall" muted>
            {t('editor.color')}
          </Text>
          <View style={styles.swatches}>
            {categoryColors.map((color) => {
              const selected = color === draft.color;
              return (
                <Pressable
                  key={color}
                  onPress={() => {
                    feedback('select');
                    update({ color });
                  }}
                  style={[
                    styles.swatch,
                    { backgroundColor: colors[color] },
                    selected && styles.swatchSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t(`colorNames.${color}`)}
                  accessibilityState={{ selected }}
                >
                  {selected ? <Icon icon={CheckIcon} size={22} color={onColor(color)} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.wordsHeader}>
            <Text variant="heading" accessibilityRole="header">
              {t('editor.words')}
            </Text>
            <Text variant="label">{t('editor.count', { count: status.wordCount })}</Text>
          </View>
          <View
            style={styles.status}
            accessibilityLiveRegion="polite"
            accessible
            accessibilityLabel={wordStatus.text}
          >
            <Icon
              icon={wordStatus.icon}
              color={status.tooFewWords && showErrors ? colors.danger : colors.textMuted}
            />
            <Text
              variant="labelSmall"
              style={styles.flex}
              color={status.tooFewWords && showErrors ? colors.danger : undefined}
              muted={!(status.tooFewWords && showErrors)}
            >
              {wordStatus.text}
            </Text>
          </View>

          <View style={styles.entryRow}>
            <TextField
              ref={entryRef}
              placeholder={t('editor.addPlaceholder')}
              accessibilityLabel={t('editor.addPlaceholder')}
              value={entry}
              onChangeText={setEntry}
              maxLength={editorLimits.maxWordLength}
              // Pas d'autocorrection : elle transformerait « Ndolé » ou « Poulet DG » (UX.md §5).
              autoCorrect={false}
              autoCapitalize="sentences"
              spellCheck={false}
              returnKeyType="done"
              submitBehavior="submit"
              onSubmitEditing={(e) => addEntry(e.nativeEvent.text)}
            />
            <Button
              label={t('editor.add')}
              icon={<Icon icon={PlusIcon} />}
              variant="secondary"
              disabled={!entry.trim()}
              onPress={() => addEntry()}
            />
          </View>
          {report ? (
            <Text variant="caption" muted accessibilityLiveRegion="polite">
              {report}
            </Text>
          ) : null}

          {pasteOpen ? (
            <View style={styles.section}>
              <TextField
                label={t('editor.pasteToggle')}
                hint={t('editor.pasteHint')}
                placeholder={t('editor.pastePlaceholder')}
                value={paste}
                onChangeText={setPaste}
                multiline
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="sentences"
              />
              <Button
                label={t('editor.pasteAdd')}
                variant="secondary"
                block
                disabled={!paste.trim()}
                onPress={addPaste}
              />
            </View>
          ) : (
            <Button
              label={t('editor.pasteToggle')}
              variant="ghost"
              icon={<Icon icon={ClipboardTextIcon} />}
              onPress={() => setPasteOpen(true)}
            />
          )}

        </View>

        <View style={styles.section}>
          <Text variant="labelSmall">{t('editor.forbiddenTitle')}</Text>
          <Text variant="caption" muted>
            {status.forbiddenVariant
              ? t('editor.forbiddenReady', { eligible: status.forbiddenEligible })
              : `${t('editor.forbiddenHint')} ${t('editor.forbiddenStatus', {
                  count: status.forbiddenEligible,
                  threshold: editorLimits.forbiddenThreshold,
                })}`}
          </Text>
        </View>

        <View style={styles.list}>
          {shownWords.slice(0, visibleWords).map((word) => {
            const open = expanded === word.text;
            const filled = cleanForbidden(word.text, word.forbidden).length;
            const fields = Math.min(
              editorLimits.maxForbidden,
              Math.max(FORBIDDEN_FIELDS, word.forbidden.length),
            );
            return (
              <View key={word.text} style={styles.word}>
                <View style={styles.wordRow}>
                  <Pressable
                    style={styles.wordMain}
                    onPress={() => setExpanded(open ? null : word.text)}
                    accessibilityRole="button"
                    accessibilityLabel={t('editor.editForbidden', { word: word.text })}
                    accessibilityState={{ expanded: open }}
                  >
                    <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                      {word.text}
                    </Text>
                    <Text variant="caption" muted>
                      {t('editor.forbiddenCount', { count: filled })}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeWord(word.text)}
                    style={styles.remove}
                    accessibilityRole="button"
                    accessibilityLabel={t('editor.removeWord', { word: word.text })}
                  >
                    <Icon icon={XIcon} color={colors.textMuted} />
                  </Pressable>
                </View>
                {open ? (
                  <View style={styles.forbidden}>
                    {Array.from({ length: fields }, (_, index) => (
                      <TextField
                        key={index}
                        ref={(input) => {
                          forbiddenRefs.current[index] = input;
                        }}
                        placeholder={t('editor.forbiddenPlaceholder', { index: index + 1 })}
                        accessibilityLabel={`${t('editor.editForbidden', { word: word.text })}, ${index + 1}`}
                        value={word.forbidden[index] ?? ''}
                        onChangeText={(value) => setForbidden(word.text, index, value)}
                        maxLength={editorLimits.maxForbiddenLength}
                        autoCorrect={false}
                        spellCheck={false}
                        // « Entrée » enchaîne : Suivant, puis Terminé (UX.md §5).
                        returnKeyType={index === fields - 1 ? 'done' : 'next'}
                        submitBehavior={index === fields - 1 ? 'blurAndSubmit' : 'submit'}
                        onSubmitEditing={() => forbiddenRefs.current[index + 1]?.focus()}
                      />
                    ))}
                    <Button
                      label={t('editor.done')}
                      variant="ghost"
                      onPress={() => setExpanded(null)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          {shownWords.length > visibleWords ? (
            <Button
              label={t('editor.showMore', {
                count: Math.min(WORDS_PAGE, shownWords.length - visibleWords),
              })}
              variant="ghost"
              block
              onPress={() => setVisibleWords((n) => n + WORDS_PAGE)}
            />
          ) : null}
        </View>
      </KeyboardScreen>

      <BottomSheet
        visible={leave !== null}
        onClose={() => setLeave(null)}
        title={t('editor.discardTitle')}
      >
        <Text muted>{t('editor.discardBody')}</Text>
        <Button
          label={t('editor.discardConfirm')}
          accent="danger"
          block
          onPress={() => {
            const action = leave;
            setLeave(null);
            leaving.current = true;
            setDirty(false);
            if (action) navigation.dispatch(action);
          }}
        />
        <Button
          label={t('editor.keepEditing')}
          variant="secondary"
          block
          onPress={() => setLeave(null)}
        />
      </BottomSheet>
    </View>
  );
}

const SWATCH = touchTarget;

const styles = StyleSheet.create({
  // Fond explicite : évite l'aplatissement Fabric de la vue englobante (voir Mes catégories).
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  preview: { alignItems: 'center' },
  previewCard: { width: '48%' },
  // La rangée d'icônes déborde volontairement des marges pour défiler jusqu'au bord.
  bleed: { marginHorizontal: -spacing.xl },
  emojis: { paddingHorizontal: spacing.xl },
  emoji: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiSelected: { borderColor: colors.text },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: colors.text },
  wordsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  list: { gap: spacing.sm },
  word: {
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  wordRow: { flexDirection: 'row', alignItems: 'center' },
  wordMain: {
    flex: 1,
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.sm,
  },
  remove: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  forbidden: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
