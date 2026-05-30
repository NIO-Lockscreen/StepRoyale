import { describe, it, expect } from 'vitest';
import {
  walkDayEarnings, idleAllowance, idlePerHour, idleFuelLeft, invariantOk, empireEff,
  comboMult, goal, capacity, legacyMult, coinsForSteps, initial, type State,
} from './engine';

const S = (p: Partial<State> = {}): State => ({ ...initial(), ...p });

/* THE PROOF — now per-day, not just per-hour.
   A day's total idle income can never reach the walking that fuels it, across every
   earning dimension and empire size. This is the fix for the old flat-cap flaw where
   capacity stopped mattering and idle dominated the daily total. */
describe('the step-vs-idle promise (per day)', () => {
  it('idle allowance < walk earnings, across combo × upgrades × legacy × events × empire × steps', () => {
    for (const combo of [0, 20, 100])
      for (const upgrades of [{}, { shoes: 50 }, { bio: 99 }])
        for (const legacy of [0, 1e6, 1e12])
          for (const eventMult of [1, 5])
            for (const stepsYest of [1, 6000, 100000])
              for (const assets of [{ lemonade: 1 }, { cafe: 5 }, { space: 1e9 }]) {
                const s = S({ combo, upgrades, legacy, eventMult, stepsYest, assets });
                expect(invariantOk(s), `combo=${combo} up=${JSON.stringify(upgrades)} legacy=${legacy} steps=${stepsYest}`).toBe(true);
                expect(idleAllowance(s)).toBeLessThan(walkDayEarnings(s));
              }
  });

  it('no steps yesterday ⇒ empire earns nothing (fuel tank empty)', () => {
    const s = S({ stepsYest: 0, assets: { space: 1e9 } });
    expect(idleAllowance(s)).toBe(0);
    expect(idlePerHour(s)).toBe(0);
  });

  it('capacity matters at EVERY empire size (the old-model bug is gone)', () => {
    const lazy = S({ stepsYest: 800, assets: { hedgefund: 1 } });   // missed goal
    const active = S({ stepsYest: 12000, assets: { hedgefund: 1 } }); // crushed it
    expect(idleAllowance(active)).toBeGreaterThan(idleAllowance(lazy) * 5);
  });

  it('a bigger empire always earns more (purchases never feel dead)', () => {
    const small = S({ stepsYest: 8000, assets: { cafe: 1 } });
    const big = S({ stepsYest: 8000, assets: { cafe: 1, hedgefund: 1 } });
    expect(idleAllowance(big)).toBeGreaterThan(idleAllowance(small));
    expect(empireEff(big)).toBeGreaterThan(empireEff(small));
  });

  it('idle stops once the daily fuel is spent', () => {
    const s = S({ stepsYest: 8000, assets: { cafe: 3 }, idleToday: 1e9 });
    expect(idleFuelLeft(s)).toBe(0);
    expect(idlePerHour(s)).toBe(0);
  });
});

describe('economy knobs', () => {
  it('combo caps at ×3', () => { expect(comboMult(0)).toBe(1); expect(comboMult(20)).toBe(3); expect(comboMult(999)).toBe(3); });
  it('legacy multiplier grows with retired net worth', () => {
    expect(legacyMult(S({ legacy: 0 }))).toBe(1);
    expect(legacyMult(S({ legacy: 1_000_000 }))).toBeCloseTo(2);
  });
  it('adaptive goal is 110% of median, banded 4k–15k', () => {
    expect(goal(S({ median7: 0 }))).toBe(4000);
    expect(goal(S({ median7: 100_000 }))).toBe(15_000);
    expect(goal(S({ median7: 10_000 }))).toBe(11_000);
  });
  it('capacity clamps to [0.10, 1.25]', () => {
    expect(capacity(S({ stepsYest: 0, median7: 7273 }))).toBeCloseTo(0.1);
    expect(capacity(S({ stepsYest: 1_000_000, median7: 7273 }))).toBeCloseTo(1.25);
  });
  it('step earnings scale with the multiplier chain', () => {
    expect(coinsForSteps(1000, S())).toBeCloseTo(100);
    expect(coinsForSteps(1000, S({ combo: 20 }))).toBeCloseTo(300);
  });
});
