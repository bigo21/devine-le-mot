import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFeedback } from '@/lib/use-feedback';
import { usePress, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing, touchTarget } from '@/ui/tokens';

import { SurfaceContext } from './surface';
import { Text } from './text';

const HEIGHT = 40;

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ReactNode;
};

/**
 * Pilule de filtre ou de choix. Sélectionnée : fond blanc cassé, texte nuit (17:1) ; le mango
 * reste réservé à l'action principale de l'écran.
 */
export function Chip({ label, selected = false, onPress, icon }: Props) {
  const reduced = useReducedMotion();
  const press = usePress(reduced);
  const feedback = useFeedback();
  const foreground = selected ? colors.bg : colors.text;

  return (
    <Pressable
      onPress={() => feedback('select', onPress)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={(touchTarget - HEIGHT) / 2}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.base, selected ? styles.selected : styles.idle, press.style]}>
        <SurfaceContext value={{ foreground, muted: foreground }}>
          {icon}
          <Text variant="labelSmall" numberOfLines={1}>
            {label}
          </Text>
        </SurfaceContext>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: HEIGHT,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.bgElevated, borderColor: colors.hairline },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
});
