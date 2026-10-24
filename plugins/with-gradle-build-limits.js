// Limite le parallélisme de Gradle pendant la génération du projet Android (prebuild).
// Sur les machines EAS gratuites (4 vCPU, ~15 Go), les compilations C++ lancées en parallèle
// (Reanimated, worklets, Skia…) saturent la mémoire et le daemon Gradle est tué.
// Une seule tâche à la fois : on peut donc donner plus de tas à Gradle (dex, Kotlin) sans risque.
const { withGradleProperties } = require('expo/config-plugins');

const limits = {
  'org.gradle.parallel': 'false',
  'org.gradle.workers.max': '1',
  'org.gradle.jvmargs': '-Xmx3072m -XX:MaxMetaspaceSize=768m',
  'kotlin.daemon.jvmargs': '-Xmx1536m',
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
