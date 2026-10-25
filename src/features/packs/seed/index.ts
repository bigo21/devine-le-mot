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
import frChanteurs from './fr-chanteurs.json';
import frExpressions from './fr-expressions.json';
import frFilms from './fr-films.json';
import frPlats from './fr-plats.json';
import frTvInternet from './fr-tv-internet.json';
import frVilles from './fr-villes.json';
import mondeAnimaux from './monde-animaux.json';
import mondeFruitsLegumes from './monde-fruits-legumes.json';
import mondeMetiers from './monde-metiers.json';
import mondeObjets from './monde-objets.json';
import mondeSports from './monde-sports.json';
import usDessinsAnimes from './us-dessins-animes.json';
import usFilms from './us-films.json';
import usMarques from './us-marques.json';
import usMusique from './us-musique.json';
import usSeries from './us-series.json';
import usSportifs from './us-sportifs.json';
import usSuperHeros from './us-super-heros.json';
import mondeActions from './monde-actions.json';
import mondeApplis from './monde-applis.json';
import mondeEmotions from './monde-emotions.json';
import mondeEnfants from './monde-enfants.json';
import mondeInstruments from './monde-instruments.json';
import mondeJeuxVideo from './monde-jeux-video.json';
import mondeMonuments from './monde-monuments.json';
import mondePays from './monde-pays.json';

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
  frChanteurs,
  frFilms,
  frPlats,
  frVilles,
  frExpressions,
  frTvInternet,
  usFilms,
  usSeries,
  usMusique,
  usSuperHeros,
  usSportifs,
  usMarques,
  usDessinsAnimes,
  mondeAnimaux,
  mondeObjets,
  mondeSports,
  mondeMetiers,
  mondeFruitsLegumes,
  mondePays,
  mondeInstruments,
  mondeActions,
  mondeEmotions,
  mondeMonuments,
  mondeJeuxVideo,
  mondeApplis,
  mondeEnfants,
];
