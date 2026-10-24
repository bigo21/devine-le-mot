// Langue de référence : toute clé ajoutée ici doit l'être aussi dans en.ts (vérifié par le typage).
export const fr = {
  app: {
    name: 'Devine le mot',
  },
  common: {
    wip: 'Écran en construction',
    back: 'Retour',
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
  },
  errors: {
    unexpected: "Oups, quelque chose s'est mal passé. Redémarre l'app.",
  },
};

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type Translation = DeepStringRecord<typeof fr>;
