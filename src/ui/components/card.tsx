import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFeedback } from '@/lib/use-feedback';
import { usePress, useReducedMotion } from '@/ui/motion';
import {
  type AccentColor,
  colors,
  onColor,
  patternOpacity,
  radii,
  shadows,
  spacing,
} from '@/ui/tokens';

import { NdopPattern } from './ndop-pattern';
import { SurfaceContext } from './surface';

type Props = {
  children: ReactNode;
  /** Couleur de catégorie : fond plein, motif en filigrane, texte `on<Couleur>`. */
  accent?: AccentColor;
  size?: 'md' | 'lg';
  /** Motif en filigrane (par défaut : seulement sur une carte colorée). */
  pattern?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  /** Style du conteneur interne (ex. `flex: 1` pour une carte de hauteur fixe). */
  contentStyle?: ViewStyle;
};

export function Card({
  children,
  accent,
  size = 'md',
  pattern = accent !== undefined,
  onPress,
  onLongPress,
  accessibilityLabel,
  style,
  contentStyle,
}: Props) {
  const reduced = useReducedMotion();
  const press = usePress(reduced);
  const feedback = useFeedback();

  const foreground = accent ? onColor(accent) : colors.text;
  const surface: ViewStyle = accent
    ? {
        backgroundColor: colors[accent],
        boxShadow: `${shadows.soft}, inset 0px 1px 0px ${colors.highlight}`,
      }
    : {
        backgroundColor: colors.bgElevated,
        borderColor: colors.hairline,
        borderWidth: 1,
        boxShadow: shadows.soft,
      };

  const body = (
    <Animated.View
      style={[
        styles.base,
        { borderRadius: size === 'lg' ? radii.lg : radii.card },
        size === 'lg' && styles.lg,
        surface,
        style,
        onPress || onLongPress ? press.style : null,
      ]}
    >
      {pattern ? <NdopPattern color={foreground} opacity={patternOpacity.card} /> : null}
      <SurfaceContext value={{ foreground, muted: accent ? foreground : colors.textMuted }}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SurfaceContext>
    </Animated.View>
  );

  if (!onPress && !onLongPress) return body;

  return (
    <Pressable
      onPress={onPress ? () => feedback('tap', onPress) : undefined}
      onLongPress={onLongPress ? () => feedback('snap', onLongPress) : undefined}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', padding: spacing.lg },
  lg: { padding: spacing.xl },
  content: { gap: spacing.sm },
});
