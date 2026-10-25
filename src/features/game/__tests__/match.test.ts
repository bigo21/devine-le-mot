import {
  amendLastTurn,
  cleanTeamName,
  createMatch,
  currentRound,
  defaultTeams,
  isFinished,
  leaders,
  MAX_TEAMS,
  nextTeamIndex,
  recordTurn,
  resizeTeams,
  standings,
  teamColors,
} from '../match';

const nameOf = (color: string) => `Équipe ${color}`;

describe('équipes', () => {
  it('noms et couleurs automatiques, entre 2 et 6 équipes', () => {
    expect(defaultTeams(3, nameOf)).toEqual([
      { name: 'Équipe hibiscus', color: 'hibiscus' },
      { name: 'Équipe lagoon', color: 'lagoon' },
      { name: 'Équipe sun', color: 'sun' },
    ]);
    expect(defaultTeams(1, nameOf)).toHaveLength(2);
    expect(defaultTeams(9, nameOf)).toHaveLength(MAX_TEAMS);
  });

  it('les couleurs sont toutes différentes', () => {
    expect(new Set(teamColors).size).toBe(teamColors.length);
  });

  it('changer le nombre d’équipes garde les noms déjà saisis', () => {
    const teams = defaultTeams(2, nameOf).map((t, i) =>
      i === 0 ? { ...t, name: 'Les Lions' } : t,
    );
    const bigger = resizeTeams(teams, 4, nameOf);
    expect(bigger.map((t) => t.name)).toEqual([
      'Les Lions',
      'Équipe lagoon',
      'Équipe sun',
      'Équipe teal',
    ]);
    expect(resizeTeams(bigger, 2, nameOf).map((t) => t.name)).toEqual([
      'Les Lions',
      'Équipe lagoon',
    ]);
  });

  it('nom vide ou trop long : nom par défaut ou tronqué', () => {
    expect(cleanTeamName('   ', 'Équipe Lagon')).toBe('Équipe Lagon');
    expect(cleanTeamName('  Les   Lions  ', 'x')).toBe('Les Lions');
    expect(cleanTeamName('x'.repeat(40), 'y')).toHaveLength(24);
  });
});

describe('déroulé d’une partie', () => {
  const teams = defaultTeams(3, nameOf);

  it('les équipes jouent à tour de rôle, chacune le nombre de manches prévu', () => {
    let match = createMatch(teams, 2);
    const order: (number | null)[] = [];
    while (!isFinished(match)) {
      order.push(nextTeamIndex(match));
      match = recordTurn(match, 1);
    }
    expect(order).toEqual([0, 1, 2, 0, 1, 2]);
    expect(nextTeamIndex(match)).toBeNull();
    expect(recordTurn(match, 5)).toBe(match);
  });

  it('numéro de manche du tour de table', () => {
    let match = createMatch(teams, 2);
    expect(currentRound(match)).toBe(1);
    match = recordTurn(recordTurn(recordTurn(match, 1), 1), 1);
    expect(currentRound(match)).toBe(2);
    match = recordTurn(recordTurn(recordTurn(match, 1), 1), 1);
    expect(currentRound(match)).toBe(2);
  });

  it('correction du score de la dernière manche', () => {
    const match = amendLastTurn(recordTurn(createMatch(teams, 1), 4), 6);
    expect(match.turns).toEqual([{ teamIndex: 0, score: 6 }]);
  });
});

describe('classement', () => {
  const teams = defaultTeams(3, nameOf);

  it('total décroissant, ex æquo au même rang', () => {
    let match = createMatch(teams, 1);
    for (const score of [5, 8, 5]) match = recordTurn(match, score);
    const rows = standings(match);
    expect(rows.map((r) => [r.teamIndex, r.total, r.rank])).toEqual([
      [1, 8, 1],
      [0, 5, 2],
      [2, 5, 2],
    ]);
  });

  it('équipes en tête : plusieurs en cas d’égalité, aucune tant que tout est à 0', () => {
    let match = createMatch(teams, 1);
    expect(leaders(match)).toEqual([]);
    for (const score of [7, 7, 2]) match = recordTurn(match, score);
    expect(leaders(match)).toEqual([0, 1]);
  });
});
