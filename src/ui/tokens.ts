// Tokens de docs/DESIGN.md §2. Toute couleur, taille, rayon ou espacement de l'app passe par ici.
import type { TextStyle } from 'react-native';

const ink = '#120E1F';

const dark = {
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
  // Couleurs de catégorie ajoutées : loin du vert « trouvé » et de l'orange « passer ».
  indigo: '#7C8CFF',
  lilac: '#B79CFF',
  orchid: '#D77CFF',
  slate: '#9AAAC8',

  // Texte posé sur une couleur vive : ratios ≥ 4,5:1 (DESIGN.md §2).
  onMango: ink,
  onHibiscus: ink,
  onPalm: ink,
  onSun: ink,
  onLagoon: ink,
  onPass: ink,
  onDanger: ink,
  onPlum: ink,
  onClay: ink,
  onTeal: ink,
  onIndigo: ink,
  onLilac: ink,
  onOrchid: ink,
  onSlate: ink,

  // Dérivés translucides (jamais sous du texte sans recalcul de contraste).
  hairline: 'rgba(247, 243, 234, 0.08)', // bordures fines, séparateurs
  highlight: 'rgba(255, 255, 255, 0.22)', // reflet subtil en haut des surfaces colorées
  scrim: 'rgba(11, 8, 20, 0.72)', // voile derrière une sheet (bgSunken)
  shadow: 'rgba(5, 3, 10, 0.55)', // ombre douce
} as const;

export type Palette = { readonly [K in keyof typeof dark]: string };

// Thème clair : prévu par DESIGN.md, secondaire pour le lancement. Il reprend le sombre tant
// qu'il n'est pas dessiné, pour que la structure light/dark existe dès maintenant.
export const themes: { dark: Palette; light: Palette } = { dark, light: dark };

export const colors = themes.dark;

export type ColorToken = keyof Palette;

/** Toutes les couleurs vives (fonds de boutons, de cartes, de démo). */
export const accentColors = [
  'mango',
  'hibiscus',
  'palm',
  'sun',
  'lagoon',
  'plum',
  'clay',
  'teal',
  'indigo',
  'lilac',
  'orchid',
  'slate',
] as const;
export type AccentColor = (typeof accentColors)[number] | 'pass' | 'danger';

/**
 * Couleurs attribuables à une catégorie (fond plein pendant la partie). Ni vert ni rouge/orange :
 * les flashs « trouvé » (palm) et « passer » (pass) doivent toujours se voir (DESIGN.md §2).
 */
export const categoryColors = ['lagoon', 'indigo', 'plum', 'lilac', 'orchid', 'slate'] as const;
export type CategoryColor = (typeof categoryColors)[number];

const onColorKey = {
  mango: 'onMango',
  hibiscus: 'onHibiscus',
  palm: 'onPalm',
  sun: 'onSun',
  lagoon: 'onLagoon',
  plum: 'onPlum',
  clay: 'onClay',
  teal: 'onTeal',
  indigo: 'onIndigo',
  lilac: 'onLilac',
  orchid: 'onOrchid',
  slate: 'onSlate',
  pass: 'onPass',
  danger: 'onDanger',
} as const satisfies Record<AccentColor, ColorToken>;

/** Couleur du texte et des icônes posés sur une couleur vive. */
export function onColor(accent: AccentColor): string {
  return colors[onColorKey[accent]];
}

export const fonts = {
  display: 'Unbounded_800ExtraBold',
  displayBold: 'Unbounded_700Bold',
  displayBlack: 'Unbounded_900Black',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  /** Police lisible proposée pour le mot en jeu (réglage « Police du mot »). */
  readable: 'AtkinsonHyperlegibleNext_800ExtraBold',
} as const;

/** Polices possibles pour le mot en jeu : Unbounded par défaut, Atkinson Hyperlegible en option. */
export const wordFonts = {
  expressive: { fontFamily: fonts.display, letterSpacing: -0.5 },
  readable: { fontFamily: fonts.readable, letterSpacing: 0 },
} as const satisfies Record<string, TextStyle>;

export type WordFont = keyof typeof wordFonts;

export const fontSizes = [12, 14, 16, 20, 24, 32, 44, 64] as const;

/**
 * Rôles typographiques : les écrans choisissent un rôle, jamais une taille.
 * Unbounded est très large : on resserre légèrement les titres et on garde des interlignes courts.
 */
export const typography = {
  hero: { fontFamily: fonts.displayBlack, fontSize: 44, lineHeight: 48, letterSpacing: -0.88 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  title: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.24 },
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26 },
  /** Titre de carte (catégorie) : Unbounded est large, 16 évite de couper les mots. */
  subheading: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 22 },
  bodyLarge: { fontFamily: fonts.bodyMedium, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
  labelSmall: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyRole = keyof typeof typography;

/** Plafond d'agrandissement de la police système (DESIGN.md §7). */
export const maxFontScale = 1.6;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 12, card: 20, lg: 32, pill: 999 } as const;

/** Taille minimale d'une cible tactile (DESIGN.md §7). */
export const touchTarget = 48;

/** Ombres douces (décalage + flou), jamais d'ombre dure. */
export const shadows = {
  soft: `0px 6px 18px ${dark.shadow}`,
  lifted: `0px 14px 32px ${dark.shadow}`,
} as const;

/** Opacité des motifs en filigrane (4–8 %, DESIGN.md §1). */
export const patternOpacity = { screen: 0.05, card: 0.08 } as const;
