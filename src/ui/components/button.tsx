import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFeedback } from '@/lib/use-feedback';
import { usePress, useReducedMotion } from '@/ui/motion';
import {
  type AccentColor,
  colors,
  onColor,
  radii,
  shadows,
  spacing,
  touchTarget,
} from '@/ui/tokens';

import { SurfaceContext } from './surface';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Couleur d'un bouton primaire (mango par défaut ; danger pour une suppression). */
  accent?: AccentColor;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  /** Occupe toute la largeur disponible. */
  block?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  accent = 'mango',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  block = false,
  accessibilityHint,
}: Props) {
  const reduced = useReducedMotion();
  const press = usePress(reduced);
  const feedback = useFeedback();
  const inactive = disabled || loading;

  const foreground = variant === 'primary' ? onColor(accent) : colors.text;
  const surface =
    variant === 'primary'
      ? {
          backgroundColor: colors[accent],
          boxShadow: `${shadows.soft}, inset 0px 1px 0px ${colors.highlight}`,
        }
      : variant === 'secondary'
        ? { backgroundColor: colors.bgElevated, borderColor: colors.hairline, borderWidth: 1 }
        : { backgroundColor: 'transparent' };

  return (
    <Pressable
      onPress={() => feedback('tap', onPress)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={inactive}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={block ? styles.block : styles.inline}
    >
      <Animated.View
        style={[
          styles.base,
          size === 'lg' ? styles.lg : styles.md,
          surface,
          disabled && styles.disabled,
          press.style,
        ]}
      >
        <SurfaceContext value={{ foreground, muted: foreground }}>
          <View style={[styles.row, loading && styles.hidden]}>
            {icon}
            <Text variant="label" numberOfLines={1}>
              {label}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator color={foreground} style={StyleSheet.absoluteFill} />
          ) : null}
        </SurfaceContext>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: { alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  md: { minHeight: touchTarget },
  lg: { minHeight: 60, paddingHorizontal: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.4 },
});
