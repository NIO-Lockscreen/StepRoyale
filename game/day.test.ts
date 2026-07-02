import { describe, it, expect } from 'vitest';
import { applyRollover, daysBetween, nextDayKey, rolloverToDay } from './day';
import { adaptiveGoal, median } from './economy';
import { initialState } from './persistence';
import type { GameState } from './types';

const day = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  dayKey: '2026-01-01',
  ...over,
});

describe('nextDayKey / daysBetween', () => {
  it('advances across month, year, and leap boundaries', () => {
    expect(nextDayKey('2026-01-31')).toBe('2026-02-01');
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01');
    expect(nextDayKey('2028-02-28')).toBe('2028-02-29'); // 2028 is a leap year
  });

  it('counts forward only', () => {
    expect(daysBetween('2026-01-01', '2026-01-04')).toBe(3);
    expect(daysBetween('2026-01-04', '2026-01-01')).toBe(0);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });
});

describe('applyRollover — streak & combo', () => {
  it('goal hit advances both streak and combo', () => {
    const s = day({ stepsToday: 10_000, streakDays: 3, comboDays: 3, streakFreezes: 1 });
    const r = applyRollover(s, '2026-01-02');
    expect(r.streakDays).toBe(4);
    expect(r.comboDays).toBe(4);
    expect(r.streakFreezes).toBe(1);
  });

  it('a miss with a freeze consumes it and protects streak AND combo', () => {
    const s = day({ stepsToday: 0, streakDays: 5, comboDays: 5, streakFreezes: 1 });
    const r = applyRollover(s, '2026-01-02');
    expect(r.streakDays).toBe(5);
    expect(r.comboDays).toBe(5);
    expect(r.streakFreezes).toBe(0);
  });

  it('a miss without a freeze breaks the streak (not just the combo)', () => {
    const s = day({ stepsToday: 0, streakDays: 5, comboDays: 5, streakFreezes: 0 });
    const r = applyRollover(s, '2026-01-02');
    expect(r.streakDays).toBe(0);
    expect(r.comboDays).toBe(0);
  });

  it('resets the daily counters and banks stepsYesterday', () => {
    const s = day({ stepsToday: 7_500, coinsToday: 999 });
    const r = applyRollover(s, '2026-01-02');
    expect(r.stepsToday).toBe(0);
    expect(r.coinsToday).toBe(0);
    expect(r.stepsYesterday).toBe(7_500);
    expect(r.dayKey).toBe('2026-01-02');
  });
});

describe('applyRollover — adaptive goal', () => {
  it('folds the day into the window and recomputes the median', () => {
    const s = day({ stepsToday: 12_000, stepHistory: [4_000] });
    const r = applyRollover(s, '2026-01-02');
    expect(r.stepHistory).toEqual([4_000, 12_000]);
    expect(r.trailing7dMedian).toBe(median([4_000, 12_000]));
  });

  it('keeps only the trailing 7 days, so the goal actually adapts', () => {
    let s = day({ stepHistory: [4_000], trailing7dMedian: 4_000 });
    for (let i = 0; i < 8; i++) {
      s = applyRollover({ ...s, stepsToday: 11_000 }, nextDayKey(s.dayKey));
    }
    expect(s.stepHistory).toHaveLength(7);
    expect(s.trailing7dMedian).toBe(11_000);
    expect(adaptiveGoal(s.trailing7dMedian)).toBe(12_100); // 110% of the new median
  });
});

describe('applyRollover — wager', () => {
  const wager = {
    tierId: 'bold', stake: 500, payout: 1_000, baseSteps: 0,
    targetSteps: 8_000, dayKey: '2026-01-01', status: 'active' as const,
  };

  it('an unresolved wager dies at midnight', () => {
    const r = applyRollover(day({ wager }), '2026-01-02');
    expect(r.wager?.status).toBe('lost');
  });

  it('a settled wager is left alone', () => {
    const r = applyRollover(day({ wager: { ...wager, status: 'won' } }), '2026-01-02');
    expect(r.wager?.status).toBe('won');
  });
});

describe('rolloverToDay — absences', () => {
  it('settles each missed day individually (3 days away = 3 freezes or a break)', () => {
    const s = day({ stepsToday: 0, streakDays: 9, comboDays: 9, streakFreezes: 2 });
    const r = rolloverToDay(s, '2026-01-04'); // 3 rollovers
    expect(r.streakFreezes).toBe(0); // two freezes eaten…
    expect(r.streakDays).toBe(0);    // …third miss breaks the streak
    expect(r.stepsYesterday).toBe(0); // capacity reflects the real (absent) yesterday
    expect(r.dayKey).toBe('2026-01-04');
  });

  it('a backwards clock jump only re-stamps the key — no phantom rollovers', () => {
    const s = day({ dayKey: '2026-01-10', streakDays: 4, streakFreezes: 1 });
    const r = rolloverToDay(s, '2026-01-08');
    expect(r.streakDays).toBe(4);
    expect(r.streakFreezes).toBe(1);
    expect(r.dayKey).toBe('2026-01-08');
  });
});
