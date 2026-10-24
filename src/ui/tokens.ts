// Tokens de docs/DESIGN.md §2. Socle minimal de la phase 0 ; le design system complet arrive en 0.3.

export const colors = {
  bg: '#120E1F',
  bgElevated: '#1C1730',
  bgSunken: '#0B0814',
  text: '#F7F3EA',
  textMuted: '#A79FBF',

  mango: '#FF9F1C',
  hibiscus: '#FF4D7E',
  palm: '#2ED47A',
  sun: '#FFD23F',
  lagoon: '#3DA9FC',
  pass: '#FF7A45',
  danger: '#FF5A5F',
  plum: '#9B5DE5',
  clay: '#E07A5F',
  teal: '#00BBA7',

  // Texte posé sur une couleur vive : ratios ≥ 4,5:1 (DESIGN.md §2).
  onMango: '#120E1F',
  onHibiscus: '#120E1F',
  onPalm: '#120E1F',
  onSun: '#120E1F',
  onLagoon: '#120E1F',
  onPass: '#120E1F',
  onDanger: '#120E1F',
  onPlum: '#120E1F',
  onClay: '#120E1F',
  onTeal: '#120E1F',
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = {
  display: 'Unbounded_800ExtraBold',
  displayBold: 'Unbounded_700Bold',
  displayBlack: 'Unbounded_900Black',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const fontSizes = [12, 14, 16, 20, 24, 32, 44, 64] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 12, card: 20, lg: 32, pill: 999 } as const;
