import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { FileArrowUpIcon } from 'phosphor-react-native/src/icons/FileArrowUp';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { useEditorHandoff } from '@/features/packs/editor-handoff';
import {
  pickPackFile,
  type ReadResult,
  readPackFile,
  readTextFile,
} from '@/features/packs/files';
import {
  type ConflictPlan,
  conflictPlan,
  copyOf,
  type ImportIssue,
  looksLikeJson,
  MAX_SHOWN_ISSUES,
  parsePackText,
  summarizePack,
} from '@/features/packs/import';
import { allPackIds, existingPackSource, importPack } from '@/features/packs/repository';
import type { PackFile } from '@/features/packs/schema';
import { useSharedPayloadsOnce } from '@/features/packs/use-incoming-share';
import { useFeedback } from '@/lib/use-feedback';
import { Button, CategoryIcon, Icon, KeyboardScreen, Text, TextField } from '@/ui/components';
import { rise, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

type ErrorCode = Extract<ReadResult, { ok: false }>['error'];

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'preview'; file: PackFile; plan: ConflictPlan }
  | { kind: 'error'; error: ErrorCode }
  | { kind: 'done'; categoryId: number | null; name: string };

/** Import d'un paquet (GAMEPLAY.md §5, UX.md §3) : fichier, fichier reçu, ou liste collée. */
export default function ImportScreen() {
  useOrientationLock('portrait');
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const params = useLocalSearchParams<{ shared?: string }>();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [paste, setPaste] = useState('');
  const [adding, setAdding] = useState(false);

  const handle = useCallback(
    async (result: ReadResult) => {
      if (!result.ok) {
        feedback('error');
        setPhase({ kind: 'error', error: result.error });
        return;
      }
      const plan = conflictPlan(await existingPackSource(db, result.file.pack.id));
      setPhase({ kind: 'preview', file: result.file, plan });
    },
    [db, feedback],
  );

  const toEditor = useCallback((text: string) => {
    useEditorHandoff.getState().give(text);
    router.replace({ pathname: '/create/editor', params: { from: 'paste' } });
  }, []);

  // Fichier ou texte partagé vers l'app depuis WhatsApp, un gestionnaire de fichiers… (best effort).
  useSharedPayloadsOnce(params.shared === '1', (payload) => {
    if (payload.kind === 'text') {
      if (looksLikeJson(payload.value)) void handle(parsePackText(payload.value));
      else toEditor(payload.value);
      return;
    }
    setPhase({ kind: 'reading' });
    // Un fichier texte (.txt) est une liste de mots ; le reste est lu comme un paquet.
    if (payload.mimeType?.startsWith('text/plain')) {
      void readTextFile(payload.uri).then((text) =>
        text === null ? handle({ ok: false, error: { code: 'unreadable' } }) : toEditor(text),
      );
      return;
    }
    void readPackFile(payload.uri).then(handle);
  });

  const pick = async () => {
    try {
      const result = await pickPackFile();
      if (!result) return;
      setPhase({ kind: 'reading' });
      await handle(result);
    } catch {
      await handle({ ok: false, error: { code: 'unreadable' } });
    }
  };

  const continuePaste = () => {
    if (looksLikeJson(paste)) void handle(parsePackText(paste));
    else toEditor(paste);
  };

  const add = async (file: PackFile, mode: 'insert' | 'replace' | 'copy') => {
    setAdding(true);
    try {
      const target =
        mode === 'copy' ? copyOf(file, await allPackIds(db), t('editor.copySuffix')) : file;
      const categoryId = await importPack(db, target, { replace: mode === 'replace' });
      feedback('record');
      setPhase({ kind: 'done', categoryId, name: target.pack.name.fr });
    } catch {
      await handle({ ok: false, error: { code: 'unreadable' } });
    } finally {
      setAdding(false);
    }
  };

  return (
    <KeyboardScreen>
      <Text variant="display" accessibilityRole="header">
        {t('importScreen.title')}
      </Text>

      {phase.kind === 'idle' || phase.kind === 'reading' ? (
        <>
          <Text muted>
            {params.shared === '1' ? t('importScreen.sharedHint') : t('importScreen.intro')}
          </Text>
          <View style={styles.section}>
            <Button
              label={t('importScreen.pickFile')}
              size="lg"
              block
              loading={phase.kind === 'reading'}
              icon={<Icon icon={FileArrowUpIcon} emphasis />}
              onPress={() => void pick()}
            />
            <Text variant="caption" muted align="center">
              {phase.kind === 'reading' ? t('importScreen.reading') : t('importScreen.pickHint')}
            </Text>
          </View>

          <Text variant="labelSmall" muted align="center">
            {t('importScreen.or')}
          </Text>

          <View style={styles.section}>
            <Text variant="heading" accessibilityRole="header">
              {t('importScreen.pasteTitle')}
            </Text>
            <TextField
              hint={t('importScreen.pasteHint')}
              placeholder={t('importScreen.pastePlaceholder')}
              accessibilityLabel={t('importScreen.pasteTitle')}
              value={paste}
              onChangeText={setPaste}
              multiline
              autoCorrect={false}
              spellCheck={false}
            />
            <Button
              label={t('importScreen.pasteContinue')}
              variant="secondary"
              block
              disabled={!paste.trim()}
              onPress={continuePaste}
            />
          </View>
        </>
      ) : null}

      {phase.kind === 'preview' ? (
        <Animated.View entering={rise({ reduced })} style={styles.section}>
          <Preview file={phase.file} />
          {phase.plan === 'ask' ? (
            <>
              <Text variant="heading">{t('importScreen.conflictTitle')}</Text>
              <Text muted>
                {t('importScreen.conflictBody', { name: phase.file.pack.name.fr })}
              </Text>
              <Button
                label={t('importScreen.keepBoth')}
                size="lg"
                block
                loading={adding}
                onPress={() => void add(phase.file, 'copy')}
              />
              <Button
                label={t('importScreen.replace')}
                variant="secondary"
                block
                disabled={adding}
                onPress={() => void add(phase.file, 'replace')}
              />
            </>
          ) : (
            <>
              {phase.plan === 'copy' ? (
                <Text variant="caption" muted>
                  {t('importScreen.builtinCopy')}
                </Text>
              ) : null}
              <Button
                label={t('importScreen.add')}
                size="lg"
                block
                loading={adding}
                onPress={() => void add(phase.file, phase.plan === 'copy' ? 'copy' : 'insert')}
              />
            </>
          )}
          <Button
            label={t('importScreen.cancel')}
            variant="ghost"
            block
            disabled={adding}
            onPress={() => setPhase({ kind: 'idle' })}
          />
        </Animated.View>
      ) : null}

      {phase.kind === 'error' ? (
        <Animated.View entering={rise({ reduced })} style={styles.section}>
          <ErrorReport error={phase.error} />
          <Button
            label={t('importScreen.pickFile')}
            block
            icon={<Icon icon={FileArrowUpIcon} />}
            onPress={() => void pick()}
          />
          <Button
            label={t('importScreen.cancel')}
            variant="ghost"
            block
            onPress={() => setPhase({ kind: 'idle' })}
          />
        </Animated.View>
      ) : null}

      {phase.kind === 'done' ? (
        <Animated.View entering={rise({ reduced })} style={styles.section}>
          <View style={styles.banner} accessible accessibilityLiveRegion="polite">
            <Icon icon={CheckCircleIcon} size={28} color={colors.palm} emphasis />
            <View style={styles.flex}>
              <Text variant="heading">{t('importScreen.added')}</Text>
              <Text muted>{phase.name}</Text>
            </View>
          </View>
          {phase.categoryId !== null ? (
            <Button
              label={t('importScreen.playNow')}
              size="lg"
              block
              icon={<Icon icon={PlayIcon} emphasis />}
              onPress={() =>
                router.replace({
                  pathname: '/play/setup',
                  params: { category: String(phase.categoryId) },
                })
              }
            />
          ) : null}
          <Button
            label={t('importScreen.seeMine')}
            variant="secondary"
            block
            onPress={() => router.replace('/create')}
          />
        </Animated.View>
      ) : null}
    </KeyboardScreen>
  );
}

/** Aperçu avant import : nom, auteur, catégories et nombre de mots. */
function Preview({ file }: { file: PackFile }) {
  const { t } = useTranslation();
  const summary = summarizePack(file);
  return (
    <View style={styles.card}>
      <Text variant="labelSmall" muted>
        {t('importScreen.previewTitle')}
      </Text>
      <Text variant="title">{summary.name}</Text>
      {summary.author ? (
        <Text variant="labelSmall" muted>
          {t('importScreen.by', { author: summary.author })}
        </Text>
      ) : null}
      <Text variant="label">
        {t('importScreen.categories', { count: summary.categories.length })} ·{' '}
        {t('importScreen.words', { count: summary.words })}
      </Text>
      <View style={styles.categories}>
        {summary.categories.slice(0, 8).map((category, index) => (
          <View key={`${category.name}-${index}`} style={styles.category}>
            <CategoryIcon emoji={category.emoji ?? null} size={32} />
            <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {category.name}
            </Text>
            <Text variant="caption" muted>
              {t('importScreen.words', { count: category.words })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Erreur d'import en français clair : quoi ne va pas, où, et comment corriger (UX.md §5). */
function ErrorReport({ error }: { error: ErrorCode }) {
  const { t } = useTranslation();
  const issueLine = (issue: ImportIssue) => {
    const text = t(`importScreen.issues.${issue.kind}`);
    if (issue.category !== undefined && issue.word !== undefined) {
      return t('importScreen.where.categoryWord', {
        category: issue.category,
        word: issue.word,
        issue: text,
      });
    }
    if (issue.category !== undefined) {
      return t('importScreen.where.category', { category: issue.category, issue: text });
    }
    return t('importScreen.where.pack', { issue: text });
  };

  return (
    <View style={styles.card} accessible accessibilityLiveRegion="assertive">
      <View style={styles.errorTitle}>
        <Icon icon={WarningIcon} size={24} color={colors.danger} emphasis />
        <Text variant="heading" style={styles.flex}>
          {t('importScreen.errorTitle')}
        </Text>
      </View>
      {error.code === 'invalid' ? (
        <>
          <Text>{t('importScreen.errors.invalid')}</Text>
          {error.issues.slice(0, MAX_SHOWN_ISSUES).map((issue, index) => (
            <Text key={index} variant="labelSmall">
              • {issueLine(issue)}
            </Text>
          ))}
          {error.issues.length > MAX_SHOWN_ISSUES ? (
            <Text variant="labelSmall" muted>
              {t('importScreen.errors.more', { count: error.issues.length - MAX_SHOWN_ISSUES })}
            </Text>
          ) : null}
          <Text muted>{t('importScreen.errors.fix')}</Text>
        </>
      ) : (
        <Text>{t(`importScreen.errors.${error.code}`)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.md },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  categories: { gap: spacing.sm, marginTop: spacing.xs },
  category: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  errorTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgElevated,
  },
});
