import { describe, it, expect } from 'vitest';
import {
  ASSET_UNLOCK_LEVEL, MAX_LEVEL, TIER_UNLOCK_LEVEL, levelForSteps, levelUpBonus,
  nextUnlock, stepsForLevel, unlocksAtLevel,
} from './progression';
import { ASSET_DEFS } from './empire';
import { TIER_ORDER } from './showroom';

describe('level curve', () => {
  it('round-trips levelForSteps ∘ stepsForLevel at every level', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      expect(levelForSteps(stepsForLevel(l))).toBe(l);
      if (l > 1) expect(levelForSteps(stepsForLevel(l) - 1)).toBe(l - 1);
    }
  });

  it('is monotonic and clamped', () => {
    expect(levelForSteps(0)).toBe(1);
    expect(levelForSteps(-50)).toBe(1);
    let prev = 1;
    for (let steps = 0; steps <= 500_000; steps += 7_919) {
      const lvl = levelForSteps(steps);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
    expect(levelForSteps(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });

  it('pays a growing bonus per level', () => {
    expect(levelUpBonus(2)).toBeGreaterThan(0);
    expect(levelUpBonus(10)).toBeGreaterThan(levelUpBonus(2));
  });
});

describe('unlock gates', () => {
  it('every asset and showroom tier has an unlock level', () => {
    for (const d of ASSET_DEFS) expect(ASSET_UNLOCK_LEVEL[d.id]).toBeGreaterThanOrEqual(1);
    for (const t of TIER_ORDER) expect(TIER_UNLOCK_LEVEL[t]).toBeGreaterThanOrEqual(1);
  });

  it('unlocksAtLevel covers everything exactly once across the ladder', () => {
    const seen: string[] = [];
    for (let l = 1; l <= MAX_LEVEL; l++) {
      seen.push(...unlocksAtLevel(l).map((u) => `${u.kind}:${u.name}`));
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(ASSET_DEFS.length + TIER_ORDER.length);
  });

  it('nextUnlock always points at the closest locked thing, then runs out', () => {
    expect(nextUnlock(1)?.atLevel).toBe(2);
    const highest = Math.max(
      ...Object.values(ASSET_UNLOCK_LEVEL),
      ...Object.values(TIER_UNLOCK_LEVEL),
    );
    expect(nextUnlock(highest - 1)?.atLevel).toBe(highest);
    expect(nextUnlock(highest)).toBeUndefined();
  });
});
