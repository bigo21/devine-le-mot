import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useFeedback } from '@/lib/use-feedback';
import { spring, timing, useReducedMotion } from '@/ui/motion';
import { project, rubberband } from '@/ui/motion/physics';
import { colors, radii, spacing } from '@/ui/tokens';

import { Text } from './text';

/** Au-delà de cette fraction (projetée) de la hauteur, le geste ferme la sheet. */
const DISMISS_AT = 0.4;

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * Sheet maison (Reanimated + Gesture Handler). Fermeture : glisser vers le bas (un geste rapide
 * suffit), toucher le voile ou bouton retour Android. Mode réduit : simple fondu.
 */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  // Hauteur de la sheet. Avant la mesure, la hauteur de l'écran (toujours plus grande) la garde
  // hors champ : l'ouverture démarre tout de suite, sans attendre un aller-retour React.
  const height = useSharedValue(window.height);
  // 0 = ouverte, 1 = cachée.
  const position = useSharedValue(1);
  const dragStart = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      position.set(reduced ? withTiming(0, timing.fast) : withSpring(0, spring.gentle));
      return;
    }
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(setMounted, false);
    };
    position.set(
      reduced
        ? withTiming(1, timing.fast, done)
        : withSpring(1, { ...spring.gentle, overshootClamping: true }, done),
    );
  }, [visible, mounted, reduced, position]);

  // La mesure ne sert qu'au geste (convertir les pixels du doigt en fraction de la hauteur).
  const onLayout = (e: LayoutChangeEvent) => {
    height.set(Math.max(1, e.nativeEvent.layout.height));
  };

  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    onActivate: () => {
      'worklet';
      dragStart.set(position.get());
    },
    onUpdate: (e) => {
      'worklet';
      const next = dragStart.get() + e.translationY / height.get();
      position.set(next >= 0 ? next : rubberband(next, 1));
    },
    onDeactivate: (e) => {
      'worklet';
      const velocity = e.velocityY / height.get();
      const projected = position.get() + project(e.velocityY) / height.get();
      if (projected > DISMISS_AT) {
        scheduleOnRN(onClose);
      } else {
        position.set(withSpring(0, { ...spring.gentle, velocity }));
        scheduleOnRN(feedback, 'snap');
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => {
    const p = position.get();
    // Toujours les deux propriétés : basculer de mode ne doit pas laisser un reste de l'autre.
    if (reduced) {
      return {
        opacity: interpolate(p, [0, 1], [1, 0], Extrapolation.CLAMP),
        transform: [{ translateY: 0 }],
      };
    }
    return { opacity: 1, transform: [{ translateY: p * height.get() }] };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(position.get(), [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={onLayout}
            accessibilityViewIsModal
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }, sheetStyle]}
          >
            <View style={styles.handle} />
            {title ? (
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
    marginBottom: spacing.xs,
  },
});
