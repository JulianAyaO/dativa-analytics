import { AlertCondition } from './alert.models';

export function alertConditionMatches(
  condition: AlertCondition,
  threshold: number,
  value: number,
  changePct: number | null,
): boolean {
  switch (condition) {
    case 'above':
    case 'goal':
      return value >= threshold;
    case 'below':
      return value <= threshold;
    case 'change_pct':
      return changePct !== null && Math.abs(changePct * 100) >= threshold;
    default:
      return false;
  }
}

export function alertRecentlyFired(lastFiredAt: string | null, frequencyMinutes: number, now = Date.now()): boolean {
  if (!lastFiredAt) {
    return false;
  }
  return now - Date.parse(lastFiredAt) < frequencyMinutes * 60_000;
}
