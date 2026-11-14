import { DeviceMobileIcon } from 'phosphor-react-native/src/icons/DeviceMobile';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon, Text } from '@/ui/components';
import { easing, fadeOut, pop, timing, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing } from '@/ui/tokens';

/**
 * « Retourne le téléphone » (UX.md §5) : bandeau avec un téléphone qui pivote de debout à couché.
 * Icône et texte, jamais la couleur seule ; mode réduit : icône fixe.
 */
export function TurnPhoneHint() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    turn.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(300, withTiming(1, { duration: 600, easing: easing.inOut })),
          withDelay(700, withTiming(1, timing.fast)),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(turn);
  }, [reduced, turn]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * -90}deg` }],
  }));

  return (
    <Animated.View
      entering={pop({ reduced })}
      exiting={fadeOut}
      style={styles.banner}
      accessibilityLiveRegion="assertive"
      accessible
      accessibilityLabel={t('hints.turnPhone')}
    >
      <Animated.View style={iconStyle}>
        <Icon icon={DeviceMobileIcon} size={32} color={colors.onSun} emphasis />
      </Animated.View>
      <View style={styles.text}>
        <Text variant="label" color={colors.onSun}>
          {t('hints.turnPhone')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.sun,
  },
  text: { flexShrink: 1 },
});
