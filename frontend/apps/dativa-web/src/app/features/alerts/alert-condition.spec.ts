import { alertConditionMatches, alertRecentlyFired } from './alert-condition';

describe('alert condition', () => {
  it('matches above, below, goal and percentage change', () => {
    expect(alertConditionMatches('above', 10, 10, null)).toBe(true);
    expect(alertConditionMatches('above', 10, 9, null)).toBe(false);
    expect(alertConditionMatches('below', 10, 10, null)).toBe(true);
    expect(alertConditionMatches('goal', 100, 120, null)).toBe(true);
    expect(alertConditionMatches('change_pct', 8, 50, 0.1)).toBe(true);
    expect(alertConditionMatches('change_pct', 8, 50, 0.05)).toBe(false);
    expect(alertConditionMatches('change_pct', 8, 50, null)).toBe(false);
  });

  it('suppresses a recent firing according to frequency', () => {
    const now = Date.parse('2026-08-24T12:00:00.000Z');
    expect(alertRecentlyFired('2026-08-24T11:59:30.000Z', 1, now)).toBe(true);
    expect(alertRecentlyFired('2026-08-24T10:00:00.000Z', 1, now)).toBe(false);
    expect(alertRecentlyFired(null, 1, now)).toBe(false);
  });
});
