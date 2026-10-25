// Réception d'un fichier ou d'un texte partagé vers l'app (intent SEND Android, GAMEPLAY.md §5).
// Best effort : selon l'app d'origine et le type envoyé, Android peut ne rien transmettre.
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useEffectEvent, useRef } from 'react';

export type IncomingPayload =
  | { kind: 'text'; value: string }
  | { kind: 'file'; uri: string; mimeType?: string };

/** Transmet le premier élément partagé une seule fois, puis vide la file des partages. */
export function useSharedPayloadsOnce(
  enabled: boolean,
  onPayload: (payload: IncomingPayload) => void,
): void {
  const { sharedPayloads, clearSharedPayloads } = useIncomingShare();
  const handled = useRef(false);
  const deliver = useEffectEvent(onPayload);

  useEffect(() => {
    if (!enabled || handled.current) return;
    const first = sharedPayloads[0];
    if (!first?.value) return;
    handled.current = true;
    clearSharedPayloads();
    const isText = !first.shareType || first.shareType === 'text' || first.shareType === 'url';
    deliver(
      isText
        ? { kind: 'text', value: first.value }
        : { kind: 'file', uri: first.value, mimeType: first.mimeType },
    );
  }, [enabled, sharedPayloads, clearSharedPayloads]);
}
