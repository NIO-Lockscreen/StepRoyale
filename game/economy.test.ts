import { describe, expect, it } from 'vitest';
import {
  activeStepRatePerHour,
  adaptiveGoal,
  capacityFactor,
  clampedIdleRatePerHour,
  comboMultiplier,
  invariantHolds,
  type Multipliers,
} from './economy';

/**
 * These tests are the PROOF of the core design promise:
 *   "At no point should steps be a worse way to earn than the in-game idle rewards."
 * If any of these fail, the central pitch of STRIDE is broken.
 */
describe('the step-vs-idle invariant', () => {
  it('idle never beats steps, across the whole multiplier space', () => {
    const comboCases = [0, 5, 20, 100];
    const upgradeCases = [1, 2, 10, 1000];
    const eventCases = [1, 2, 5];
    // An absurdly overbuilt empire trying to out-earn walking:
    const rawIdleCases = [0, 100, 10_000, 1_000_000_000];

    for (const comboDays of comboCases)
      for (const upgradeMult of upgradeCases)
        for (const eventMult of eventCases)
          for (const rawIdle of rawIdleCases) {
            const m: Multipliers = { comboDays, upgradeMult, eventMult };
            const clamped = clampedIdleRatePerHour(rawIdle, m);
            expect(
              invariantHolds(clamped, m),
              `idle ${clamped}/h must stay below walk rate (combo=${comboDays} up=${upgradeMult} ev=${eventMult} raw=${rawIdle})`,
            ).toBe(true);
          }
  });

  it('walking is always at least 2x more efficient than pure idle', () => {
    const m: Multipliers = { comboDays: 7, upgradeMult: 3, eventMult: 2 };
    const cappedIdle = clampedIdleRatePerHour(Number.MAX_SAFE_INTEGER, m);
    expect(activeStepRatePerHour(m)).toBeGreaterThanOrEqual(cappedIdle * 2);
  });

  it('multipliers lift steps in lockstep so idle can never overtake', () => {
    const plain = activeStepRatePerHour({ comboDays: 0, upgradeMult: 1, eventMult: 1 });
    const buffed = activeStepRatePerHour({ comboDays: 20, upgradeMult: 10, eventMult: 1 });
    expect(buffed).toBeGreaterThan(plain);
  });
});

describe('supporting economy', () => {
  it('capacity factor clamps to [0.10, 1.25]', () => {
    expect(capacityFactor(0, 8000)).toBeCloseTo(0.1);
    expect(capacityFactor(99_999, 8000)).toBeCloseTo(1.25);
    expect(capacityFactor(8000, 8000)).toBeCloseTo(1.0);
  });

  it('adaptive goal is 110% of median, banded 4k–15k', () => {
    expect(adaptiveGoal(0)).toBe(4000);
    expect(adaptiveGoal(100_000)).toBe(15_000);
    expect(adaptiveGoal(10_000)).toBe(11_000);
  });

  it('combo caps at x3.0', () => {
    expect(comboMultiplier(0)).toBeCloseTo(1.0);
    expect(comboMultiplier(20)).toBeCloseTo(3.0);
    expect(comboMultiplier(999)).toBeCloseTo(3.0);
  });
});
