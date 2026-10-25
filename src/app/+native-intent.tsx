// Liens système entrants (Expo Router) : un partage vers l'app (fichier .devine.json ou liste de
// mots) arrive sous la forme expo-sharing://… et ouvre l'écran d'import.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (new URL(path).hostname === 'expo-sharing') return '/create/import?shared=1';
    return path;
  } catch {
    // Ce n'est pas toujours une URL valide : on la laisse au routeur.
    return path;
  }
}
