// L'activité principale gère elle-même les changements de taille de police et d'affichage.
// Sans ça, Android la détruit et la recrée quand on change la police système, l'app étant
// ouverte ou en arrière-plan : React Native remontait alors une deuxième racine (deux
// NavigationContainer, routeur indisponible). La nouvelle taille arrive via les dimensions
// de React Native (useWindowDimensions().fontScale), que l'accueil et les cartes suivent.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const EXTRA = ['fontScale', 'density'];

module.exports = function withConfigChanges(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    const current = (activity.$['android:configChanges'] ?? '').split('|').filter(Boolean);
    for (const change of EXTRA) if (!current.includes(change)) current.push(change);
    activity.$['android:configChanges'] = current.join('|');
    return config;
  });
};
