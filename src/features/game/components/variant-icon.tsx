import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ChatCircleDotsIcon } from 'phosphor-react-native/src/icons/ChatCircleDots';
import { HandPointingIcon } from 'phosphor-react-native/src/icons/HandPointing';
import { HandWavingIcon } from 'phosphor-react-native/src/icons/HandWaving';
import { MaskHappyIcon } from 'phosphor-react-native/src/icons/MaskHappy';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { NumberCircleOneIcon } from 'phosphor-react-native/src/icons/NumberCircleOne';
import { ProhibitIcon } from 'phosphor-react-native/src/icons/Prohibit';
import { ShuffleIcon } from 'phosphor-react-native/src/icons/Shuffle';
import { SpeakerHighIcon } from 'phosphor-react-native/src/icons/SpeakerHigh';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { easing, motion, useReducedMotion } from '@/ui/motion';
import { colors, onColor, radii } from '@/ui/tokens';

import { type VariantId, variantAccent } from '../variants';

const icons: Record<VariantId, PhosphorIcon> = {
  classic: ChatCircleDotsIcon,
  mime: HandWavingIcon,
  sounds: SpeakerHighIcon,
  'one-word': NumberCircleOneIcon,
  sing: MusicNotesIcon,
  forbidden: ProhibitIcon,
  'air-draw': HandPointingIcon,
  imitation: MaskHappyIcon,
  mix: ShuffleIcon,
};

type Props = {
  variant: VariantId;
  size?: number;
  /** Anime l'icône (variante sélectionnée) ; immobile sinon, et toujours en mode réduit. */
  active?: boolean;
};

/**
 * Icône animée d'une variante : pastille de la couleur d'accent, icône Phosphor, et un petit
 * geste en boucle propre à la variante (la main salue, les notes sautent…). Décorative : le nom
 * de la variante est toujours écrit à côté. Remplaçable plus tard par un Lottie.
 */
export function VariantIcon({ variant, size = 56, active = false }: Props) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const accent = variantAccent[variant];
  const Glyph = icons[variant];

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(t);
      t.set(withTiming(0, { duration: motion.variantIconLoop / 2 }));
      return;
    }
    t.set(0);
    t.set(
      withRepeat(
        withTiming(1, { duration: motion.variantIconLoop, easing: easing.inOut }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(t);
  }, [active, reduced, t]);

  const style = useAnimatedStyle(() => {
    const v = t.get();
    switch (variant) {
      case 'mime':
        return { transform: [{ rotate: `${-14 + 28 * v}deg` }] };
      case 'sounds':
      case 'classic':
        return { transform: [{ scale: 1 + 0.1 * v }] };
      case 'one-word':
      case 'sing':
        return {
          transform: [{ translateY: -5 * v }, { rotate: `${variant === 'sing' ? 8 * v : 0}deg` }],
        };
      case 'forbidden':
        return { transform: [{ translateX: -3 + 6 * v }] };
      case 'air-draw':
        // La main trace un petit arc, comme un doigt qui dessine.
        return {
          transform: [{ translateX: -5 + 10 * v }, { translateY: -4 * Math.sin(v * Math.PI) }],
        };
      case 'imitation':
        return { transform: [{ rotate: `${-10 + 20 * v}deg` }] };
      case 'mix':
        return { transform: [{ scaleX: 1 - 2 * v * (1 - v) * 2 }] };
    }
  });

  return (
    <View
      style={[styles.badge, { width: size, height: size, backgroundColor: colors[accent] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={style}>
        <Glyph size={size * 0.56} weight="duotone" color={onColor(accent)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
