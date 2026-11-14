import { isRecord, moodFor } from '../celebration';

describe('réaction aux résultats', () => {
  it('bon score : au moins un mot toutes les 10 s (et 3 mots au moins)', () => {
    expect(moodFor(6, 60, false)).toBe('celebrate');
    expect(moodFor(3, 30, false)).toBe('celebrate');
    expect(moodFor(2, 10, false)).toBe('neutral');
  });

  it('score faible : moins de 2 mots par minute, la mascotte fait la moue', () => {
    expect(moodFor(1, 60, false)).toBe('pout');
    expect(moodFor(0, 30, false)).toBe('pout');
    expect(moodFor(3, 60, false)).toBe('neutral');
  });

  it('un record se fête toujours', () => {
    expect(moodFor(1, 60, true)).toBe('celebrate');
  });

  it('record : seulement s’il existe un score précédent et qu’on le dépasse', () => {
    expect(isRecord(5, null)).toBe(false);
    expect(isRecord(5, 5)).toBe(false);
    expect(isRecord(6, 5)).toBe(true);
  });
});
