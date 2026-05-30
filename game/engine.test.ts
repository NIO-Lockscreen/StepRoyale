import { describe, it, expect } from 'vitest';
import { walkPerHour, idlePerHour, invariantOk, comboMult, goal, capacity, initial, type State } from './engine';

const S = (p: Partial<State> = {}): State => ({ ...initial(), ...p });

/* The proof of the core promise: steps must never be a worse way to earn than idle. */
describe('the step-vs-idle invariant', () => {
  it('idle never beats walking across the whole multiplier + empire space', () => {
    for (const combo of [0, 5, 20, 100])
      for (const upgradeMult of [1, 2, 10, 1000])
        for (const eventMult of [1, 2, 5])
          for (const stepsYest of [0, 6000, 1_000_000])
            for (const assets of [{}, { space: 100_000 }]) {   // {} → no empire, or an absurd one
              const s = S({ combo, upgradeMult, eventMult, stepsYest, assets });
              expect(invariantOk(s), `combo=${combo} up=${upgradeMult} ev=${eventMult}`).toBe(true);
              expect(idlePerHour(s)).toBeLessThan(walkPerHour(s));
            }
  });

  it('walking is always at least 2× pure idle', () => {
    const s = S({ combo: 7, upgradeMult: 3, eventMult: 2, stepsYest: 1_000_000, assets: { space: 1e9 } });
    expect(walkPerHour(s)).toBeGreaterThanOrEqual(idlePerHour(s) * 2);
  });
});

describe('economy knobs', () => {
  it('combo caps at ×3', () => { expect(comboMult(0)).toBe(1); expect(comboMult(20)).toBe(3); expect(comboMult(999)).toBe(3); });
  it('adaptive goal is 110% of median, banded 4k–15k', () => {
    expect(goal(S({ median7: 0 }))).toBe(4000);
    expect(goal(S({ median7: 100_000 }))).toBe(15_000);
    expect(goal(S({ median7: 10_000 }))).toBe(11_000);
  });
  it('capacity clamps to [0.10, 1.25]', () => {
    expect(capacity(S({ stepsYest: 0, median7: 7273 }))).toBeCloseTo(0.1);       // goal ≈ 8000
    expect(capacity(S({ stepsYest: 1_000_000, median7: 7273 }))).toBeCloseTo(1.25);
  });
});
