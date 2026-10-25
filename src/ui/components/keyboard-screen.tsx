import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, patternOpacity, spacing } from '@/ui/tokens';

import { NdopPattern } from './ndop-pattern';

type Props = {
  children: ReactNode;
  /** Pied fixe (boutons d'action) : hors du défilement, au-dessus de la barre de navigation. */
  footer?: ReactNode;
  contentStyle?: ViewStyle;
};

/** Marge entre le champ actif et le haut du clavier. */
const KEYBOARD_GAP = spacing.xl;

/**
 * Écran défilant avec saisie (UX.md §5) : le champ actif reste au-dessus du clavier, qui est
 * suivi image par image ; toucher hors d'un champ ou faire défiler ferme le clavier.
 * Même fond, filigrane et zones sûres que `Screen`.
 */
export function KeyboardScreen({ children, footer, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const sides: ViewStyle = {
    paddingLeft: insets.left + spacing.xl,
    paddingRight: insets.right + spacing.xl,
  };

  return (
    <View style={styles.root}>
      <NdopPattern color={colors.text} opacity={patternOpacity.screen} />
      <KeyboardAwareScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          sides,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: (footer ? 0 : insets.bottom) + spacing.xl,
          },
          contentStyle,
        ]}
        bottomOffset={KEYBOARD_GAP}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <View style={[styles.footer, sides, { paddingBottom: insets.bottom + spacing.lg }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { gap: spacing.lg },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
});
