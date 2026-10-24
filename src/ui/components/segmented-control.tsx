import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useFeedback } from '@/lib/use-feedback';
import { spring, useReducedMotion } from '@/ui/motion';
import { colors, radii, spacing, touchTarget } from '@/ui/tokens';

import { Text } from './text';

const PADDING = 4;

type Option<T> = { value: T; label: string };

type Props<T extends string | number> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Choix exclusif court (durée de manche…). L'indicateur glisse sous l'option choisie. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const x = useSharedValue(0);
  useEffect(() => {
    const target = index * segmentWidth;
    x.set(reduced ? target : withSpring(target, spring.snappy));
  }, [index, segmentWidth, reduced, x]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {segmentWidth > 0 ? (
        <Animated.View style={[styles.indicator, { width: segmentWidth }, indicatorStyle]} />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            style={styles.segment}
            onPress={() => {
              if (!selected) feedback('select', () => onChange(option.value));
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
          >
            <Text variant="labelSmall" color={selected ? colors.bg : colors.text} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: touchTarget + PADDING * 2,
    padding: PADDING,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  indicator: {
    position: 'absolute',
    top: PADDING,
    left: PADDING,
    bottom: PADDING,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
