// Réception d'un fichier ou d'un texte partagé vers l'app (intent SEND Android, GAMEPLAY.md §5).
// Best effort : selon l'app d'origine et le type envoyé, Android peut ne rien transmettre.
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useEffectEvent, useRef } from 'react';

export type IncomingPayload =
  | { kind: 'text'; value: string }
  | { kind: 'file'; uri: string; mimeType?: string };

/**
 * Transmet le premier élément partagé une seule fois, puis vide la file des partages. Pour un
 * fichier, on lit la copie locale faite par expo-sharing (`contentUri`, dans le cache) : la
 * permission sur l'URI `content://` d'origine peut expirer.
 */
export function useSharedPayloadsOnce(
  enabled: boolean,
  onPayload: (payload: IncomingPayload) => void,
): void {
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads } = useIncomingShare();
  const handled = useRef(false);
  const deliver = useEffectEvent(onPayload);

  useEffect(() => {
    if (!enabled || handled.current || isResolving) return;
    const first = resolvedSharedPayloads[0];
    if (!first) return;
    const isText = first.shareType === 'text' || first.shareType === 'url' || !first.contentUri;
    const value = isText ? first.value : first.contentUri;
    if (!value) return;
    handled.current = true;
    clearSharedPayloads();
    deliver(
      isText
        ? { kind: 'text', value }
        : { kind: 'file', uri: value, mimeType: first.contentMimeType ?? first.mimeType },
    );
  }, [enabled, resolvedSharedPayloads, isResolving, clearSharedPayloads]);
}
