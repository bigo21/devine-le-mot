import { Canvas, Circle, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';
import { colors, fonts, spacing } from '@/ui/tokens';

// Écran caché de vérification : Skia + Reanimated doivent tourner en build release (R8 actif).
export default function DevSkiaScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const size = width - spacing.xl * 2;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const radius = useDerivedValue(() => size * (0.25 + progress.value * 0.1));

  return (
    <PlaceholderScreen title={t('screens.devSkia')}>
      <Text style={styles.hint}>{t('dev.skiaHint')}</Text>
      <Canvas style={{ width: size, height: size }}>
        <Rect x={0} y={0} width={size} height={size}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(size, size)}
            colors={[colors.hibiscus, colors.mango, colors.sun]}
          />
        </Rect>
        <Circle cx={size / 2} cy={size / 2} r={radius} color={colors.bg} />
      </Canvas>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.text, fontFamily: fonts.body, fontSize: 14 },
});
