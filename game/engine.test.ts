import { describe, it, expect } from 'vitest';
import { walkPerHour, idlePerHour, invariantOk, comboMult, goal, capacity, legacyMult, initial, type State } from './engine';

const S = (p: Partial<State> = {}): State => ({ ...initial(), ...p });

/* The proof of the core promise: steps must never be a worse way to earn than idle.
   Now swept across EVERY earning dimension added for fun — combo, upgrades, legacy,
   events, and an absurd empire — because each new boost lifts walking too. */
describe('the step-vs-idle invariant', () => {
  it('idle never beats walking across combo × upgrades × legacy × events × empire', () => {
    for (const combo of [0, 20, 100])
      for (const upgrades of [{}, { shoes: 50 }, { bio: 99 }])
        for (const legacy of [0, 1e6, 1e12])
          for (const eventMult of [1, 5])
            for (const stepsYest of [0, 1_000_000])
              for (const assets of [{}, { space: 1e9 }]) {
                const s = S({ combo, upgrades, legacy, eventMult, stepsYest, assets });
                expect(invariantOk(s), `combo=${combo} up=${JSON.stringify(upgrades)} legacy=${legacy}`).toBe(true);
                expect(idlePerHour(s)).toBeLessThan(walkPerHour(s));
              }
  });

  it('walking is always at least 2× pure idle', () => {
    const s = S({ combo: 20, upgrades: { bio: 99 }, legacy: 1e12, eventMult: 5, stepsYest: 1e6, assets: { space: 1e12 } });
    expect(walkPerHour(s)).toBeGreaterThanOrEqual(idlePerHour(s) * 2);
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
});
