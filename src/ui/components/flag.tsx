import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { type FlagCode, flags } from '@/assets/flags/flags';
import { colors, radii } from '@/ui/tokens';

type Props = {
  code: FlagCode;
  size?: number;
};

/** Drapeau en pastille ronde (flag-icons). Décoratif : le libellé voisin nomme le pays. */
export function Flag({ code, size = 20 }: Props) {
  return (
    <View
      style={[styles.mask, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SvgXml xml={flags[code]} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
