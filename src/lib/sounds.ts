import {
  type AudioPlayer,
  type AudioSource,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';

// Famille de sons de docs/DESIGN.md §5 : sons Kenney (CC0), mono, normalisés à −14 LUFS,
// choisis à l'oreille (voir assets/CREDITS.md). Une entrée à null ne joue rien.
export type SoundName = 'start' | 'found' | 'pass' | 'tick' | 'end' | 'record';

const sources: Record<SoundName, AudioSource> = {
  start: require('@/assets/sounds/start.m4a') as number,
  found: require('@/assets/sounds/found.m4a') as number,
  pass: require('@/assets/sounds/pass.m4a') as number,
  tick: require('@/assets/sounds/tick.m4a') as number,
  end: require('@/assets/sounds/end.m4a') as number,
  record: require('@/assets/sounds/record.m4a') as number,
};

const players = new Map<SoundName, AudioPlayer>();
let audioModeReady: Promise<void> | null = null;

function ensureAudioMode(): Promise<void> {
  // En soirée, la musique tourne souvent sur le même téléphone : on se mélange à elle
  // au lieu de la couper.
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    allowsRecording: false,
  }).catch(() => undefined);
  return audioModeReady;
}

function playerFor(name: SoundName): AudioPlayer | null {
  const source = sources[name];
  if (source == null) return null;
  let player = players.get(name);
  if (!player) {
    player = createAudioPlayer(source);
    players.set(name, player);
  }
  return player;
}

/** Joue un son court depuis le début. `volume` entre 0 et 1. */
export function playSound(name: SoundName, volume: number): void {
  const player = playerFor(name);
  if (!player) return;
  void ensureAudioMode();
  player.volume = Math.min(1, Math.max(0, volume));
  void player.seekTo(0);
  player.play();
}
