// Paquets intégrés à l'app (un fichier par catégorie, format docs/pack.schema.json).
// Insérés en base au premier lancement et à chaque nouvelle version (voir seed.ts).
import afArtistes from './af-artistes.json';
import afFootballeurs from './af-footballeurs.json';
import afHistoriques from './af-historiques.json';
import afPaysCapitales from './af-pays-capitales.json';
import afPlats from './af-plats.json';
import camerounCuisine from './cameroun-cuisine.json';
import cmArtistes from './cm-artistes.json';
import cmExpressions from './cm-expressions.json';
import cmFootballeurs from './cm-footballeurs.json';
import cmMusique from './cm-musique.json';
import cmVillesQuartiers from './cm-villes-quartiers.json';
import mondeAnimaux from './monde-animaux.json';
import mondeFruitsLegumes from './monde-fruits-legumes.json';
import mondeMetiers from './monde-metiers.json';
import mondeObjets from './monde-objets.json';
import mondeSports from './monde-sports.json';

/** Contenu brut : validé par zod avant insertion (et par les tests). */
export const builtinPackFiles: readonly unknown[] = [
  camerounCuisine,
  cmArtistes,
  cmFootballeurs,
  cmVillesQuartiers,
  cmExpressions,
  cmMusique,
  afPaysCapitales,
  afArtistes,
  afPlats,
  afFootballeurs,
  afHistoriques,
  mondeAnimaux,
  mondeObjets,
  mondeSports,
  mondeMetiers,
  mondeFruitsLegumes,
];
