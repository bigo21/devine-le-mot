// Configuration dynamique : reprend app.json et règle les permissions Android.
// - Toujours retirées : stockage externe (l'import passe par le sélecteur de fichiers système)
//   et SYSTEM_ALERT_WINDOW (fenêtre flottante du menu de développement).
// - INTERNET retirée du build de production : l'app est 100 % hors ligne (PROJET.md §1). Le build
//   de développement la garde pour charger le code depuis Metro. EAS fournit EAS_BUILD_PROFILE.
const ALWAYS_BLOCKED = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
];

module.exports = ({ config }) => {
  const production = process.env.EAS_BUILD_PROFILE === 'production';
  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [
        ...ALWAYS_BLOCKED,
        ...(production ? ['android.permission.INTERNET'] : []),
      ],
    },
  };
};
