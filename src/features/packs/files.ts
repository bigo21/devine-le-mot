// Fichiers de paquets : export vers la feuille de partage Android, lecture d'un fichier choisi ou
// reçu (GAMEPLAY.md §5). Les fichiers exportés vont dans le cache de l'app : rien à nettoyer.
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportFileName } from './editor';
import { type ParseResult, parsePackText } from './import';
import { type PackFile, packLimits } from './schema';

/** Types proposés par le sélecteur : les messageries envoient souvent un .json en octet-stream. */
export const PACK_MIME_TYPES = ['application/json', 'application/octet-stream', 'text/plain'];

export type ShareOutcome = 'shared' | 'unavailable';

/** Écrit `nom-du-pack.devine.json` dans le cache et ouvre la feuille de partage. */
export async function sharePackFile(file: PackFile, dialogTitle: string): Promise<ShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  // Sous-dossier dédié : à la réception, expo-sharing copie le fichier reçu à la racine du cache
  // sous son nom d'origine ; partagé vers l'app elle-même, il écraserait la source en la lisant.
  const folder = new Directory(Paths.cache, 'exports');
  if (!folder.exists) folder.create({ intermediates: true });
  const output = new File(folder, exportFileName(file.pack.name.fr));
  output.create({ overwrite: true });
  await output.write(JSON.stringify(file, null, 2));
  await Sharing.shareAsync(output.uri, { mimeType: 'application/json', dialogTitle });
  return 'shared';
}

export type ReadResult = ParseResult | { ok: false; error: { code: 'unreadable' } };

/** Lit et valide un fichier (URI `file://` ou `content://`), taille vérifiée avant lecture. */
export async function readPackFile(uri: string): Promise<ReadResult> {
  try {
    const file = new File(uri);
    const size = file.size ?? 0;
    if (size > packLimits.maxFileBytes) return { ok: false, error: { code: 'tooLarge' } };
    const text = await file.text();
    return parsePackText(text, size || text.length);
  } catch {
    return { ok: false, error: { code: 'unreadable' } };
  }
}

/** Lit un fichier texte (liste de mots reçue), `null` s'il est illisible ou trop lourd. */
export async function readTextFile(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);
    if ((file.size ?? 0) > packLimits.maxFileBytes) return null;
    return await file.text();
  } catch {
    return null;
  }
}

/** Ouvre le sélecteur de fichiers ; `null` si l'utilisateur annule. */
export async function pickPackFile(): Promise<ReadResult | null> {
  const picked = await File.pickFileAsync({ mimeTypes: PACK_MIME_TYPES });
  if (picked.canceled) return null;
  return readPackFile(picked.result.uri);
}
