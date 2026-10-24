import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { easing, motion, useReducedMotion } from '@/ui/motion';
import { maxFontScale, typography, type TypographyRole } from '@/ui/tokens';

import { useSurface } from './surface';

// Un TextInput non éditable permet de changer le texte depuis le thread UI, sans re-render React.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  value: number;
  variant?: TypographyRole;
  color?: string;
  /** Valeur de départ du défilement au premier affichage. */
  from?: number;
  style?: TextStyle;
};

/** `count` : le nombre défile jusqu'à sa valeur et ralentit à la fin (scores, nombre de mots). */
export function CountText({ value, variant = 'display', color, from = value, style }: Props) {
  const reduced = useReducedMotion();
  const surface = useSurface();
  const shown = useSharedValue(from);

  useEffect(() => {
    shown.set(
      reduced ? value : withTiming(value, { duration: motion.countDuration, easing: easing.out }),
    );
  }, [value, reduced, shown]);

  const animatedProps = useAnimatedProps(() => {
    const text = String(Math.round(shown.get()));
    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      caretHidden
      pointerEvents="none"
      underlineColorAndroid="transparent"
      maxFontSizeMultiplier={maxFontScale}
      defaultValue={String(from)}
      accessibilityLabel={String(value)}
      animatedProps={animatedProps}
      style={[styles.reset, typography[variant], { color: color ?? surface.foreground }, style]}
    />
  );
}

const styles = StyleSheet.create({
  // Sur Android, TextInput ajoute des marges de police : on les retire pour s'aligner sur Text.
  reset: { padding: 0, margin: 0, includeFontPadding: false, fontVariant: ['tabular-nums'] },
});
