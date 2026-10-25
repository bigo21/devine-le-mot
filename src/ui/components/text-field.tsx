import type { ComponentRef, Ref } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, maxFontScale, radii, spacing, touchTarget, typography } from '@/ui/tokens';

import { Text } from './text';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Aide ou erreur sous le champ (l'erreur est aussi annoncée, jamais par la couleur seule). */
  hint?: string;
  error?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Champ de saisie : surface enfoncée, coins arrondis, curseur mango, cible ≥ 48 dp. */
export function TextField({
  label,
  hint,
  error,
  multiline,
  accessibilityLabel,
  ref,
  ...rest
}: Props) {
  const message = error ?? hint;
  return (
    <View style={styles.root}>
      {label ? (
        <Text variant="labelSmall" muted>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.mango}
        cursorColor={colors.mango}
        maxFontSizeMultiplier={maxFontScale}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={message}
        style={[styles.input, multiline && styles.multiline, error ? styles.invalid : null]}
        {...rest}
      />
      {message ? (
        <Text variant="caption" color={error ? colors.danger : undefined} muted={!error}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs, flexGrow: 1, flexShrink: 1 },
  input: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.hairline,
    color: colors.text,
    ...typography.body,
  },
  multiline: { minHeight: 140, paddingTop: spacing.md },
  invalid: { borderColor: colors.danger },
});
