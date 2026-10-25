// Mode équipes (docs/GAMEPLAY.md §3, UX.md §3) : logique pure, testable. Une partie enchaîne
// des manches à tour de rôle ; chaque équipe joue `roundsPlanned` manches.
import type { AccentColor } from '@/ui/tokens';

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;
export const MAX_TEAM_NAME = 24;

/**
 * Couleurs des équipes, dans l'ordre d'attribution : vives et bien distinctes entre elles. Elles
 * colorent l'écran de passage et le tableau des scores, jamais le fond de la partie (qui garde la
 * couleur de la catégorie).
 */
export const teamColors = ['hibiscus', 'lagoon', 'sun', 'teal', 'orchid', 'mango'] as const;
export type TeamColor = (typeof teamColors)[number] & AccentColor;

export type Team = { name: string; color: TeamColor };

/** Manche jouée par une équipe. */
export type Turn = { teamIndex: number; score: number };

export type MatchState = {
  teams: readonly Team[];
  /** Manches par équipe. */
  roundsPlanned: number;
  turns: readonly Turn[];
};

/** Équipes par défaut : « Équipe Hibiscus », « Équipe Lagon »… (noms fournis par l'i18n). */
export function defaultTeams(count: number, nameOf: (color: TeamColor) => string): Team[] {
  const n = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, count));
  return teamColors.slice(0, n).map((color) => ({ name: nameOf(color), color }));
}

/** Ajuste le nombre d'équipes en gardant les noms déjà saisis. */
export function resizeTeams(
  teams: readonly Team[],
  count: number,
  nameOf: (color: TeamColor) => string,
): Team[] {
  const defaults = defaultTeams(count, nameOf);
  return defaults.map((team, i) => teams[i] ?? team);
}

/** Nom saisi nettoyé ; vide → nom par défaut de la couleur. */
export function cleanTeamName(name: string, fallback: string): string {
  const cleaned = name.replace(/\s+/g, ' ').trim().slice(0, MAX_TEAM_NAME);
  return cleaned || fallback;
}

export function createMatch(teams: readonly Team[], roundsPlanned: number): MatchState {
  return { teams, roundsPlanned: Math.max(1, roundsPlanned), turns: [] };
}

export const totalTurns = (state: MatchState) => state.teams.length * state.roundsPlanned;

export const isFinished = (state: MatchState) => state.turns.length >= totalTurns(state);

/** Équipe qui joue la prochaine manche (à tour de rôle), ou `null` si la partie est finie. */
export function nextTeamIndex(state: MatchState): number | null {
  if (isFinished(state)) return null;
  return state.turns.length % state.teams.length;
}

/** Numéro (à partir de 1) du tour de table en cours : « Manche 2 / 3 ». */
export function currentRound(state: MatchState): number {
  return Math.min(state.roundsPlanned, Math.floor(state.turns.length / state.teams.length) + 1);
}

export function recordTurn(state: MatchState, score: number): MatchState {
  const teamIndex = nextTeamIndex(state);
  if (teamIndex === null) return state;
  return { ...state, turns: [...state.turns, { teamIndex, score }] };
}

/** Corrige le score de la dernière manche (mot corrigé sur l'écran des résultats). */
export function amendLastTurn(state: MatchState, score: number): MatchState {
  const last = state.turns[state.turns.length - 1];
  if (!last) return state;
  return { ...state, turns: [...state.turns.slice(0, -1), { ...last, score }] };
}

export type Standing = {
  teamIndex: number;
  team: Team;
  total: number;
  /** Rang (1 = en tête) ; les ex æquo partagent le même rang. */
  rank: number;
  roundsPlayed: number;
};

/** Classement : total décroissant, ex æquo au même rang, ordre des équipes en cas d'égalité. */
export function standings(state: MatchState): Standing[] {
  const rows = state.teams.map((team, teamIndex) => {
    const turns = state.turns.filter((t) => t.teamIndex === teamIndex);
    return {
      teamIndex,
      team,
      total: turns.reduce((sum, t) => sum + t.score, 0),
      roundsPlayed: turns.length,
    };
  });
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.teamIndex - b.teamIndex);
  return sorted.map((row) => ({
    ...row,
    rank: 1 + sorted.filter((other) => other.total > row.total).length,
  }));
}

/** Équipes en tête (plusieurs en cas d'égalité) ; vide tant que personne n'a marqué. */
export function leaders(state: MatchState): number[] {
  const rows = standings(state);
  const best = rows[0]?.total ?? 0;
  if (best === 0) return [];
  return rows.filter((row) => row.total === best).map((row) => row.teamIndex);
}
