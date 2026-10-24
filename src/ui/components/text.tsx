import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { maxFontScale, typography, type TypographyRole } from '@/ui/tokens';

import { useSurface } from './surface';

export type TextProps = RNTextProps & {
  variant?: TypographyRole;
  /** Couleur explicite ; par défaut, celle de la surface courante. */
  color?: string;
  muted?: boolean;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', color, muted, align, style, ...rest }: TextProps) {
  const surface = useSurface();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontScale}
      style={[
        typography[variant],
        { color: color ?? (muted ? surface.muted : surface.foreground), textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
