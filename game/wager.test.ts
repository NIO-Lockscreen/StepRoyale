import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from './store';
import { MIN_STAKE, WAGER_TIERS, stakePresets, wagerExtraSteps } from './wager';

describe('wager helpers', () => {
  it('tiers demand more steps for bigger payouts', () => {
    const goal = 4_400;
    const extras = WAGER_TIERS.map((t) => wagerExtraSteps(goal, t));
    for (let i = 1; i < extras.length; i++) expect(extras[i]).toBeGreaterThan(extras[i - 1]);
    expect(WAGER_TIERS.map((t) => t.payoutMult)).toEqual([1.5, 2, 3]);
  });

  it('stake presets stay within the wallet and above the minimum', () => {
    for (const coins of [100, 137, 999, 50_000, 3_000_000]) {
      const presets = stakePresets(coins);
      expect(presets.length).toBeGreaterThan(0);
      for (const p of presets) {
        expect(p).toBeGreaterThanOrEqual(MIN_STAKE);
        expect(p).toBeLessThanOrEqual(coins);
      }
    }
  });
});

describe('wager flow through the store', () => {
  beforeEach(() => gameStore.resetAll());

  it('placing deducts the stake and walking to the target pays out instantly', () => {
    const before = gameStore.getSnapshot();
    expect(gameStore.placeWager('safe', 200)).toBe(true);

    let s = gameStore.getSnapshot();
    expect(s.coins).toBeCloseTo(before.coins - 200);
    expect(s.wager?.status).toBe('active');
    const target = s.wager!.targetSteps;

    gameStore.ingestSteps(target); // walk past the target
    s = gameStore.getSnapshot();
    expect(s.wager?.status).toBe('won');
    expect(s.wager?.payout).toBe(300); // 200 × 1.5
    // Wallet gained the payout on top of the normal step earnings.
    expect(s.coins).toBeGreaterThan(before.coins - 200 + 300);
  });

  it('is one per day: no second wager after placing, even after a win is dismissed', () => {
    expect(gameStore.placeWager('bold', 150)).toBe(true);
    expect(gameStore.placeWager('bold', 150)).toBe(false); // one is live

    gameStore.ingestSteps(gameStore.getSnapshot().wager!.targetSteps);
    gameStore.dismissWager();
    expect(gameStore.getSnapshot().wager).toBeNull();
    expect(gameStore.placeWager('bold', 150)).toBe(false); // same day — still no
  });

  it('rejects stakes below the minimum or beyond the wallet', () => {
    expect(gameStore.placeWager('safe', MIN_STAKE - 1)).toBe(false);
    expect(gameStore.placeWager('safe', gameStore.getSnapshot().coins + 1)).toBe(false);
    expect(gameStore.getSnapshot().wager).toBeNull();
  });

  it('an active wager cannot be dismissed', () => {
    gameStore.placeWager('safe', 150);
    gameStore.dismissWager();
    expect(gameStore.getSnapshot().wager?.status).toBe('active');
  });

  it('a wager left unresolved is lost at the (forced) day rollover', () => {
    gameStore.placeWager('royale', 150);
    gameStore.forceRollover();
    expect(gameStore.getSnapshot().wager?.status).toBe('lost');
  });
});
