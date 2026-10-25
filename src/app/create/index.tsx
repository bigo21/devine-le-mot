import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useOrientationLock } from '@/features/game/use-orientation-lock';
import { CategoryCard } from '@/features/packs/components/category-card';
import { sharePackFile } from '@/features/packs/files';
import { matchesFilter } from '@/features/packs/filter';
import {
  type CategorySummary,
  deleteUserCategory,
  exportPackOf,
  listCategories,
} from '@/features/packs/repository';
import { useFeedback } from '@/lib/use-feedback';
import { BottomSheet, Button, Icon, Screen, Text } from '@/ui/components';
import { Mascot } from '@/ui/mascot';
import { fadeOut, rise, staggerDelay, useReducedMotion } from '@/ui/motion';
import { colors, spacing } from '@/ui/tokens';

type SheetState = { category: CategorySummary; confirmDelete: boolean } | null;

/** « Mes catégories » : créées, dupliquées ou importées (UX.md §3, GAMEPLAY.md §5). */
export default function MyCategoriesScreen() {
  useOrientationLock('portrait');
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const reduced = useReducedMotion();
  const feedback = useFeedback();

  const [categories, setCategories] = useState<CategorySummary[] | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () =>
      listCategories(db, i18n.language).then((list) =>
        setCategories(list.filter((c) => matchesFilter(c, 'mine'))),
      ),
    [db, i18n.language],
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const open = (category: CategorySummary) => {
    setMessage(null);
    setSheet({ category, confirmDelete: false });
  };

  const play = (category: CategorySummary) => {
    setSheet(null);
    router.push({ pathname: '/play/setup', params: { category: String(category.id) } });
  };

  const edit = (category: CategorySummary) => {
    setSheet(null);
    router.push({ pathname: '/create/editor', params: { id: String(category.id) } });
  };

  const share = async (category: CategorySummary) => {
    setBusy(true);
    try {
      const file = await exportPackOf(db, category.id);
      if (!file) throw new Error('export impossible');
      const outcome = await sharePackFile(
        file,
        t('myCategories.shareTitle', { name: category.name }),
      );
      if (outcome === 'unavailable') setMessage(t('myCategories.shareUnavailable'));
    } catch {
      setMessage(t('myCategories.shareFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: CategorySummary) => {
    setBusy(true);
    try {
      await deleteUserCategory(db, category.id);
      feedback('select');
      setSheet(null);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const empty = categories !== null && categories.length === 0;

  return (
    <View style={styles.fill}>
      <Screen scroll>
        <Text variant="display" accessibilityRole="header">
          {t('screens.create')}
        </Text>
        <Text muted>{t('myCategories.intro')}</Text>

        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={t('myCategories.create')}
              block
              icon={<Icon icon={PlusIcon} />}
              onPress={() => router.push('/create/editor')}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={t('myCategories.import')}
              variant="secondary"
              block
              icon={<Icon icon={DownloadSimpleIcon} />}
              onPress={() => router.push('/create/import')}
            />
          </View>
        </View>

        {empty ? (
          // collapsable={false} : conteneurs jamais aplatis par Fabric. Sinon, quand la grille
          // remplace l'état vide au retour sur l'écran, les animations d'entrée insèrent les cartes
          // dans un parent natif qui n'existe plus (« View already has a parent »).
          <Animated.View entering={rise({ reduced })} style={styles.empty} collapsable={false}>
            <Mascot state="think" size={120} />
            <Text align="center" muted>
              {t('myCategories.empty')}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.grid} collapsable={false}>
            {(categories ?? []).map((category, index) => (
              <Animated.View
                key={category.id}
                entering={rise({ delay: staggerDelay(index) ?? 0, reduced })}
                exiting={fadeOut}
                style={styles.gridItem}
              >
                <CategoryCard category={category} onPress={() => open(category)} />
              </Animated.View>
            ))}
          </View>
        )}
      </Screen>

      <BottomSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={
          sheet?.confirmDelete
            ? t('myCategories.deleteTitle', { name: sheet.category.name })
            : sheet?.category.name
        }
      >
        {sheet && !sheet.confirmDelete ? (
          <>
            <Text variant="labelSmall" muted>
              {sheet.category.source === 'imported'
                ? t('myCategories.imported')
                : t('myCategories.created')}
              {' · '}
              {t('categoriesScreen.words', { count: sheet.category.wordCount })}
            </Text>
            <Button
              label={t('myCategories.play')}
              size="lg"
              block
              icon={<Icon icon={PlayIcon} emphasis />}
              onPress={() => play(sheet.category)}
            />
            <Button
              label={t('myCategories.edit')}
              variant="secondary"
              block
              icon={<Icon icon={PencilSimpleIcon} />}
              onPress={() => edit(sheet.category)}
            />
            <Button
              label={t('myCategories.share')}
              variant="secondary"
              block
              loading={busy}
              icon={<Icon icon={ShareNetworkIcon} />}
              onPress={() => void share(sheet.category)}
            />
            <Button
              label={t('myCategories.delete')}
              variant="ghost"
              block
              icon={<Icon icon={TrashIcon} />}
              onPress={() => setSheet({ ...sheet, confirmDelete: true })}
            />
            {message ? (
              <Text variant="caption" muted accessibilityLiveRegion="polite">
                {message}
              </Text>
            ) : null}
          </>
        ) : null}
        {sheet?.confirmDelete ? (
          <>
            <Text muted>{t('myCategories.deleteBody')}</Text>
            <Button
              label={t('myCategories.deleteConfirm')}
              accent="danger"
              size="lg"
              block
              loading={busy}
              icon={<Icon icon={TrashIcon} />}
              onPress={() => void remove(sheet.category)}
            />
            <Button
              label={t('myCategories.cancel')}
              variant="secondary"
              block
              onPress={() => setSheet({ ...sheet, confirmDelete: false })}
            />
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond explicite : une vue sans propriété visuelle est aplatie par Fabric, ce qui casse les
  // animations d'entrée de la grille et les canvas Skia du filigrane.
  fill: { flex: 1, backgroundColor: colors.bg },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '48%' },
  empty: { alignItems: 'center', gap: spacing.lg, marginTop: spacing.xl },
});
