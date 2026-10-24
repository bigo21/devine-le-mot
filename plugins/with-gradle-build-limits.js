// Limite le parallélisme de Gradle pendant la génération du projet Android (prebuild).
// Sur les machines EAS gratuites (4 vCPU, ~15 Go), les compilations C++ lancées en parallèle
// (Reanimated, worklets, Skia…) saturent la mémoire et le daemon Gradle est tué.
const { withGradleProperties } = require('expo/config-plugins');

const limits = {
  'org.gradle.parallel': 'false',
  'org.gradle.workers.max': '2',
};

module.exports = function withGradleBuildLimits(config) {
  return withGradleProperties(config, (config) => {
    for (const [key, value] of Object.entries(limits)) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );
      if (existing) existing.value = value;
      else config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
};
