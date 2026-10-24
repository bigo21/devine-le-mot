// Moteur d'une manche (docs/GAMEPLAY.md §1 et §4, docs/UX.md §5) : logique pure, testable.
// L'heure (`now`, en ms) et le hasard (`random`) sont injectés : aucun effet de bord ici.

export type Card = {
  /** Identifiant du mot en base (table `words`). */
  id: number;
  text: string;
  forbidden?: readonly string[];
};

export type CardResult = 'found' | 'passed';

export type PlayedCard = { card: Card; result: CardResult; at: number };

export type RoundStatus = 'ready' | 'playing' | 'paused' | 'finished';

export type RoundState = {
  status: RoundStatus;
  durationMs: number;
  /** Ordre de tirage de la manche. */
  deck: readonly Card[];
  /** Position de la carte affichée dans `deck`. */
  position: number;
  results: readonly PlayedCard[];
  /** Temps de jeu écoulé avant la dernière reprise (pauses exclues). */
  elapsedMs: number;
  /** Début de la période de jeu en cours (null hors jeu). */
  runningSince: number | null;
  /** Nombre de remélanges après avoir épuisé tous les mots (« Tu as fait le tour »). */
  reshuffles: number;
  /** Mots disponibles pour remélanger. */
  pool: readonly Card[];
};

export type Random = () => number;

/** Générateur pseudo-aléatoire reproductible (tests, parties rejouables). */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates (renvoie une copie). */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/**
 * Ordre de tirage : d'abord les mots non vus récemment (mélangés), puis les autres (mélangés).
 * Tirage sans remise sur la manche (GAMEPLAY.md §4).
 */
export function buildDeck(
  cards: readonly Card[],
  recentlySeen: ReadonlySet<number>,
  random: Random,
): Card[] {
  const fresh = cards.filter((card) => !recentlySeen.has(card.id));
  const seen = cards.filter((card) => recentlySeen.has(card.id));
  return [...shuffle(fresh, random), ...shuffle(seen, random)];
}

export function createRound(options: {
  cards: readonly Card[];
  durationMs: number;
  recentlySeen?: ReadonlySet<number>;
  random: Random;
}): RoundState {
  const unique = [...new Map(options.cards.map((card) => [card.id, card])).values()];
  return {
    status: 'ready',
    durationMs: options.durationMs,
    deck: buildDeck(unique, options.recentlySeen ?? new Set(), options.random),
    position: 0,
    results: [],
    elapsedMs: 0,
    runningSince: null,
    reshuffles: 0,
    pool: unique,
  };
}

export function startRound(state: RoundState, now: number): RoundState {
  if (state.status !== 'ready') return state;
  return { ...state, status: 'playing', runningSince: now };
}

/** Temps de jeu écoulé, pauses exclues. */
export function elapsed(state: RoundState, now: number): number {
  const running = state.runningSince === null ? 0 : Math.max(0, now - state.runningSince);
  return Math.min(state.durationMs, state.elapsedMs + running);
}

export function remainingMs(state: RoundState, now: number): number {
  return Math.max(0, state.durationMs - elapsed(state, now));
}

/** Carte affichée, ou null hors jeu. */
export function currentCard(state: RoundState): Card | null {
  if (state.status !== 'playing') return null;
  return state.deck[state.position] ?? null;
}

/** Met fin à la manche si le temps est écoulé (à appeler à chaque tic d'horloge). */
export function tick(state: RoundState, now: number): RoundState {
  if (state.status !== 'playing' || remainingMs(state, now) > 0) return state;
  // Le mot affiché au moment où le temps s'écoule n'est ni trouvé ni passé.
  return { ...state, status: 'finished', elapsedMs: state.durationMs, runningSince: null };
}

/** Le joueur a trouvé ou passé la carte affichée. */
export function answer(
  state: RoundState,
  result: CardResult,
  now: number,
  random: Random,
): RoundState {
  const timed = tick(state, now);
  const card = currentCard(timed);
  if (!card) return timed;

  const results = [...timed.results, { card, result, at: now }];
  const nextPosition = timed.position + 1;
  if (nextPosition < timed.deck.length) {
    return { ...timed, results, position: nextPosition };
  }
  // Tous les mots ont été vus : on remélange (UX.md §5), en évitant de reproposer tout de suite
  // le dernier mot.
  let deck = shuffle(timed.pool, random);
  if (deck.length > 1 && deck[0]?.id === card.id) deck = [...deck.slice(1), card];
  return { ...timed, results, deck, position: 0, reshuffles: timed.reshuffles + 1 };
}

export function pause(state: RoundState, now: number): RoundState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'paused', elapsedMs: elapsed(state, now), runningSince: null };
}

/** Reprise après pause (l'écran relance un compte à rebours 3-2-1 avant, UX.md §5). */
export function resume(state: RoundState, now: number): RoundState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'playing', runningSince: now };
}

/** Correction sur l'écran des résultats : bascule trouvé ↔ passé (UX.md §5). */
export function toggleResult(state: RoundState, index: number): RoundState {
  const played = state.results[index];
  if (state.status !== 'finished' || !played) return state;
  const flipped: CardResult = played.result === 'found' ? 'passed' : 'found';
  const results = state.results.map((entry, i) =>
    i === index ? { ...entry, result: flipped } : entry,
  );
  return { ...state, results };
}

export function score(state: RoundState): number {
  return state.results.filter((entry) => entry.result === 'found').length;
}

/** Mots vus pendant la manche (à enregistrer dans `seen_words`). */
export function seenCardIds(state: RoundState): number[] {
  return [...new Set(state.results.map((entry) => entry.card.id))];
}
