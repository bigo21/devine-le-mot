import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, patternOpacity, spacing } from '@/ui/tokens';

import { NdopPattern } from './ndop-pattern';

type Props = {
  children: ReactNode;
  /** Contenu défilant (listes courtes, réglages). Les longues listes gèrent leur propre défilement. */
  scroll?: boolean;
  /** Motif Ndop en filigrane sur le fond. */
  pattern?: boolean;
  contentStyle?: ViewStyle;
};

/** Écran de base : fond `bg`, filigrane, marges et zones sûres (barres système, encoche). */
export function Screen({ children, scroll = false, pattern = true, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: insets.top + spacing.xl,
    paddingBottom: insets.bottom + spacing.xl,
    paddingLeft: insets.left + spacing.xl,
    paddingRight: insets.right + spacing.xl,
  };

  return (
    <View style={styles.root}>
      {pattern ? <NdopPattern color={colors.text} opacity={patternOpacity.screen} /> : null}
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, styles.content, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { gap: spacing.lg },
});
