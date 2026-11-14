// Configuration Metro : celle d'Expo, plus une redirection pour three.js.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @react-three/fiber/native charge `three` avec require(), ce qui sélectionne three.cjs : ce
// fichier appelle process.emitWarning, absent de React Native, et plante au chargement. On sert la
// version module (three.module.js), la même pour tous les imports de three.
const threeModule = path.resolve(__dirname, 'node_modules/three/build/three.module.js');
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: threeModule };
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
