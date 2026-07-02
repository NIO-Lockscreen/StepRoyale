import type { GameState } from './types';
import { adaptiveGoal, median } from './economy';
import { todayKey } from './persistence';

/**
 * Day rollover, extracted as pure functions so the rules are testable and can be
 * looped once per missed day (a 3-day absence costs 3 freezes, not 1).
 */

export function nextDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + 1));
}

/** Whole days from `fromKey` forward to `toKey`; 0 if `toKey` isn't ahead. */
export function daysBetween(fromKey: string, toKey: string): number {
  if (toKey <= fromKey) return 0; // YYYY-MM-DD compares lexicographically
  let n = 0;
  for (let k = fromKey; k !== toKey && n < 4000; n++) k = nextDayKey(k);
  return n;
}

/** Settle ONE finished day: streak/combo, adaptive goal window, wager, daily counters. */
export function applyRollover(s: GameState, newKey: string): GameState {
  const hitGoal = s.stepsToday >= adaptiveGoal(s.trailing7dMedian);
  let { comboDays, streakDays, streakFreezes } = s;
  if (hitGoal) {
    comboDays += 1;
    streakDays += 1;
  } else if (streakFreezes > 0) {
    streakFreezes -= 1; // a freeze protects both the streak and the combo
  } else {
    comboDays = 0;
    streakDays = 0; // a miss breaks the streak — losses have to be real
  }

  // Fold the finished day into the trailing window; tomorrow's goal adapts to it.
  const stepHistory = [...s.stepHistory, s.stepsToday].slice(-7);

  // An unresolved wager dies at midnight.
  const wager = s.wager?.status === 'active' ? { ...s.wager, status: 'lost' as const } : s.wager;

  return {
    ...s,
    comboDays,
    streakDays,
    streakFreezes,
    stepHistory,
    trailing7dMedian: median(stepHistory),
    wager,
    wagersPlacedToday: 0,
    stepsYesterday: s.stepsToday,
    stepsToday: 0,
    coinsToday: 0,
    dayKey: newKey,
  };
}

/** Roll forward one day at a time until `targetKey`. A backwards clock jump just
 *  re-stamps the key — never punishes the player with phantom rollovers. */
export function rolloverToDay(s: GameState, targetKey: string): GameState {
  if (targetKey <= s.dayKey) {
    return targetKey === s.dayKey ? s : { ...s, dayKey: targetKey };
  }
  let cur = s;
  for (let i = 0; cur.dayKey !== targetKey && i < 400; i++) {
    cur = applyRollover(cur, nextDayKey(cur.dayKey));
  }
  return cur.dayKey === targetKey ? cur : { ...cur, dayKey: targetKey };
}
