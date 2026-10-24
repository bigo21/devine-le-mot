import {
  answer,
  buildDeck,
  type Card,
  createRound,
  currentCard,
  elapsed,
  pause,
  remainingMs,
  resume,
  type RoundState,
  score,
  seededRandom,
  seenCardIds,
  shuffle,
  startRound,
  tick,
  toggleResult,
} from '../engine';

const cards: Card[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Mot ${i + 1}` }));
const MINUTE = 60_000;

function started(options: { durationMs?: number; seed?: number; deck?: Card[] } = {}) {
  const random = seededRandom(options.seed ?? 42);
  const round = createRound({
    cards: options.deck ?? cards,
    durationMs: options.durationMs ?? MINUTE,
    random,
  });
  return { state: startRound(round, 0), random };
}

describe('tirage', () => {
  it('shuffle est une permutation reproductible avec la même graine', () => {
    const a = shuffle(cards, seededRandom(7));
    const b = shuffle(cards, seededRandom(7));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x.id - y.id)).toEqual(cards);
  });

  it('les mots non vus récemment passent avant les autres', () => {
    const seen = new Set([1, 2, 3, 4, 5, 6]);
    const deck = buildDeck(cards, seen, seededRandom(1));
    const firstSix = deck.slice(0, 6).map((card) => card.id);
    expect(firstSix.every((id) => !seen.has(id))).toBe(true);
  });

  it('sans remise : aucun mot ne revient avant que tous aient été vus', () => {
    let { state, random } = started();
    const shown: number[] = [];
    for (let i = 0; i < cards.length; i++) {
      shown.push(currentCard(state)!.id);
      state = answer(state, 'found', 1000 + i, random);
    }
    expect(new Set(shown).size).toBe(cards.length);
    expect(state.reshuffles).toBe(1);
  });

  it('ignore les doublons dans la liste de mots', () => {
    const round = createRound({
      cards: [...cards, cards[0]!],
      durationMs: MINUTE,
      random: seededRandom(3),
    });
    expect(round.deck).toHaveLength(cards.length);
  });

  it('au remélange, ne repropose pas aussitôt le dernier mot', () => {
    const small = cards.slice(0, 2);
    for (let seed = 0; seed < 20; seed++) {
      let { state, random } = started({ deck: small, seed });
      const last = (() => {
        state = answer(state, 'found', 10, random);
        const card = currentCard(state)!;
        state = answer(state, 'found', 20, random);
        return card;
      })();
      expect(currentCard(state)!.id).not.toBe(last.id);
    }
  });
});

describe('déroulé', () => {
  it('une manche prête n’affiche rien tant qu’elle n’a pas commencé', () => {
    const round = createRound({ cards, durationMs: MINUTE, random: seededRandom(1) });
    expect(round.status).toBe('ready');
    expect(currentCard(round)).toBeNull();
    expect(currentCard(startRound(round, 0))).not.toBeNull();
  });

  it('trouvé et passé sont enregistrés, le score compte les trouvés', () => {
    let { state, random } = started();
    state = answer(state, 'found', 1000, random);
    state = answer(state, 'passed', 2000, random);
    state = answer(state, 'found', 3000, random);
    expect(state.results.map((r) => r.result)).toEqual(['found', 'passed', 'found']);
    expect(score(state)).toBe(2);
  });

  it('la manche se termine quand le temps est écoulé', () => {
    let { state } = started({ durationMs: 30_000 });
    expect(tick(state, 29_999).status).toBe('playing');
    state = tick(state, 30_000);
    expect(state.status).toBe('finished');
    expect(remainingMs(state, 99_999)).toBe(0);
  });

  it('le mot affiché à la fin du temps n’est pas compté', () => {
    let { state, random } = started({ durationMs: 30_000 });
    state = answer(state, 'found', 10_000, random);
    // Le geste arrive après la fin : il est ignoré.
    state = answer(state, 'found', 31_000, random);
    expect(state.status).toBe('finished');
    expect(state.results).toHaveLength(1);
  });

  it('aucune réponse n’est prise hors jeu', () => {
    const round = createRound({ cards, durationMs: MINUTE, random: seededRandom(1) });
    expect(answer(round, 'found', 0, seededRandom(1)).results).toEqual([]);
  });
});

describe('pause et reprise (appel entrant, retour)', () => {
  it('le temps est figé pendant la pause', () => {
    let { state } = started({ durationMs: MINUTE });
    state = pause(state, 20_000);
    expect(state.status).toBe('paused');
    expect(elapsed(state, 50_000)).toBe(20_000);
    expect(currentCard(state)).toBeNull();
    state = resume(state, 50_000);
    expect(remainingMs(state, 60_000)).toBe(30_000);
  });

  it('pas de réponse pendant la pause', () => {
    let { state, random } = started();
    state = pause(state, 5_000);
    expect(answer(state, 'found', 6_000, random).results).toEqual([]);
  });

  it('pause et reprise n’ont pas d’effet dans le mauvais état', () => {
    const { state } = started();
    expect(resume(state, 1)).toBe(state);
    const finished = tick(state, MINUTE);
    expect(pause(finished, MINUTE + 1)).toBe(finished);
  });
});

describe('résultats', () => {
  function finishedRound(): RoundState {
    let { state, random } = started({ durationMs: 30_000 });
    state = answer(state, 'found', 1_000, random);
    state = answer(state, 'passed', 2_000, random);
    state = answer(state, 'found', 3_000, random);
    return tick(state, 30_000);
  }

  it('toucher un mot bascule trouvé ↔ passé et recalcule le score', () => {
    let state = finishedRound();
    expect(score(state)).toBe(2);
    state = toggleResult(state, 1);
    expect(state.results[1]!.result).toBe('found');
    expect(score(state)).toBe(3);
    state = toggleResult(state, 0);
    expect(score(state)).toBe(2);
  });

  it('pas de correction pendant la partie ni sur un index invalide', () => {
    const { state } = started();
    expect(toggleResult(state, 0)).toBe(state);
    const done = finishedRound();
    expect(toggleResult(done, 99)).toBe(done);
  });

  it('liste les mots vus, sans doublon, pour seen_words', () => {
    const state = finishedRound();
    expect(seenCardIds(state)).toHaveLength(3);
  });
});
