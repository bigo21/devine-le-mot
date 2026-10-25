// Paquets intégrés à l'app (un fichier par catégorie, format docs/pack.schema.json).
// Insérés en base au premier lancement et à chaque nouvelle version (voir seed.ts).
import camerounCuisine from './cameroun-cuisine.json';
import mondeAnimaux from './monde-animaux.json';
import mondeMetiers from './monde-metiers.json';
import mondeObjets from './monde-objets.json';
import mondeSports from './monde-sports.json';

/** Contenu brut : validé par zod avant insertion (et par les tests). */
export const builtinPackFiles: readonly unknown[] = [
  camerounCuisine,
  mondeAnimaux,
  mondeObjets,
  mondeSports,
  mondeMetiers,
];
