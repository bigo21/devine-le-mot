// Langue de référence : toute clé ajoutée ici doit l'être aussi dans en.ts (vérifié par le typage).
export const fr = {
  app: {
    name: 'Devine le mot',
  },
  common: {
    wip: 'Écran en construction',
    back: 'Retour',
    close: 'Fermer',
  },
  screens: {
    home: 'Accueil',
    categories: 'Catégories',
    categoryDetail: 'Catégorie',
    playSetup: 'Préparer la partie',
    playReady: 'Pose le téléphone sur ton front',
    playGame: 'Partie',
    playResults: 'Résultats',
    create: 'Mes catégories',
    editor: 'Créer une catégorie',
    tutorial: 'Comment jouer',
    settings: 'Réglages',
    devSkia: 'Test Skia (dev)',
    devUi: 'Design system (dev)',
  },
  devUi: {
    intro: 'Tous les composants et mouvements, pour validation sur téléphone.',
    sections: {
      colors: 'Couleurs',
      type: 'Typographie',
      buttons: 'Boutons',
      chips: 'Pilules',
      segmented: 'Choix segmenté',
      cards: 'Cartes',
      word: 'Mot en jeu',
      sheet: 'Feuille du bas',
      motion: 'Mouvements',
      feedback: 'Retours (vibrations)',
    },
    word: {
      label: 'Police du mot',
      expressive: 'Expressive',
      readable: 'Lisible',
      instruction: 'Décris le mot sans le prononcer',
    },
    typeSample: 'Ndolé, soya et makossa',
    buttons: {
      play: 'Jouer',
      primary: 'C’est parti',
      secondary: 'Catégories',
      ghost: 'Plus tard',
      danger: 'Supprimer',
      disabled: 'Indisponible',
      loading: 'Chargement',
    },
    regions: {
      cm: 'Cameroun',
      africa: 'Afrique',
      fr: 'France',
      us: 'États-Unis',
      world: 'Monde',
      party: 'Soirée',
      mine: 'Mes catégories',
    },
    durationLabel: 'Durée de la manche',
    seconds: '{{count}} s',
    cards: {
      plain: 'Carte simple sur fond élevé.',
      hint: 'Appui long : aperçu des mots',
      words: '{{count}} mots',
      food: 'Plats camerounais',
      music: 'Artistes africains',
      football: 'Footballeurs',
      party: 'Situations gênantes',
      animals: 'Animaux',
    },
    sheet: {
      open: 'Ouvrir la feuille',
      title: 'Aperçu',
      body: 'Glisse vers le bas, touche le voile ou utilise le retour pour fermer.',
    },
    motion: {
      reduced: 'Mode réduit : {{state}}',
      on: 'activé',
      off: 'désactivé',
      toggleReduced: 'Mode réduit (réglage de l’app)',
      pop: 'Rejouer pop',
      rise: 'Rejouer rise',
      breathe: 'Respiration',
      shake: 'Secouer',
      count: 'Nouveau score',
      flashFound: 'Flash trouvé',
      flashPass: 'Flash passer',
      score: 'Score',
    },
    feedback: {
      found: 'Trouvé',
      pass: 'Passer',
      end: 'Fin',
      error: 'Erreur',
    },
  },
  dev: {
    skiaHint:
      'Si le dégradé s’affiche et que le disque respire, Skia et Reanimated fonctionnent dans ce build.',
  },
  errors: {
    unexpected: "Oups, quelque chose s'est mal passé. Redémarre l'app.",
  },
};

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type Translation = DeepStringRecord<typeof fr>;
