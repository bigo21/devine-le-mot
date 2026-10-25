// Fichier généré par scripts/fluent-emoji.mjs : icônes Fluent Emoji 3D (MIT), WebP 256 px.
export const categoryIcons = {
  'animaux': require('./animaux.webp') as number,
  'artistes-africains': require('./artistes-africains.webp') as number,
  'expressions': require('./expressions.webp') as number,
  'footballeurs': require('./footballeurs.webp') as number,
  'fruits-et-legumes': require('./fruits-et-legumes.webp') as number,
  'metiers': require('./metiers.webp') as number,
  'musique': require('./musique.webp') as number,
  'objets-du-quotidien': require('./objets-du-quotidien.webp') as number,
  'plats-camerounais': require('./plats-camerounais.webp') as number,
  'region-africa': require('./region-africa.webp') as number,
  'region-mine': require('./region-mine.webp') as number,
  'region-party': require('./region-party.webp') as number,
  'region-world': require('./region-world.webp') as number,
  'situations-genantes': require('./situations-genantes.webp') as number,
  'sports': require('./sports.webp') as number,
  'villes-quartiers': require('./villes-quartiers.webp') as number,
};

export type CategoryIconName = keyof typeof categoryIcons;

/** Emoji (sans sélecteur de variante U+FE0F) → icône Fluent correspondante. */
export const emojiIcons: Record<string, CategoryIconName> = {
  "🦁": 'animaux',
  "🎤": 'artistes-africains',
  "💬": 'expressions',
  "⚽": 'footballeurs',
  "🥭": 'fruits-et-legumes',
  "👷": 'metiers',
  "🥁": 'musique',
  "🧰": 'objets-du-quotidien',
  "🍲": 'plats-camerounais',
  "🌍": 'region-africa',
  "✏": 'region-mine',
  "🎉": 'region-party',
  "🌐": 'region-world',
  "😬": 'situations-genantes',
  "🏅": 'sports',
  "🏙": 'villes-quartiers',
};
