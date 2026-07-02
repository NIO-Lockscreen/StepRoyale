import { describe, it, expect, beforeEach } from 'vitest';
import { gameStore } from './store';
import { FREEZES_PER_MONTH } from './pro';

describe('Royale Pro perks', () => {
  beforeEach(() => gameStore.resetAll());

  it('everything is gated while locked: no freeze claims, no cosmetics, one wager slot', () => {
    expect(gameStore.maxWagerSlots()).toBe(1);
    expect(gameStore.claimStreakFreeze()).toBe(false);
    expect(gameStore.freezeStashRemaining()).toBe(0);
    gameStore.setProTheme('emerald');
    gameStore.setFlexFrame('onyx');
    const s = gameStore.getSnapshot();
    expect(s.proTheme).toBe('gold');
    expect(s.flexFrame).toBe('classic');
  });

  it('debug Unlock Everything opens every perk, exactly like a purchase', () => {
    gameStore.setDebugUnlockEverything(true);
    expect(gameStore.maxWagerSlots()).toBe(2);
    gameStore.setProTheme('emerald');
    gameStore.setFlexFrame('onyx');
    const s = gameStore.getSnapshot();
    expect(s.proTheme).toBe('emerald');
    expect(s.flexFrame).toBe('onyx');
  });

  it('the freeze stash grants freezes, capped per month', () => {
    gameStore.purchasePro();
    const before = gameStore.getSnapshot().streakFreezes;
    for (let i = 0; i < FREEZES_PER_MONTH; i++) {
      expect(gameStore.claimStreakFreeze()).toBe(true);
    }
    expect(gameStore.claimStreakFreeze()).toBe(false); // stash empty
    expect(gameStore.getSnapshot().streakFreezes).toBe(before + FREEZES_PER_MONTH);
    expect(gameStore.freezeStashRemaining()).toBe(0);
  });

  it('Pro grants a second daily wager slot', () => {
    gameStore.purchasePro();
    expect(gameStore.placeWager('safe', 100)).toBe(true);
    // Win and dismiss the first…
    gameStore.ingestSteps(gameStore.getSnapshot().wager!.targetSteps);
    gameStore.dismissWager();
    // …the second slot opens; a third does not.
    expect(gameStore.placeWager('bold', 100)).toBe(true);
    gameStore.ingestSteps(gameStore.getSnapshot().wager!.targetSteps + 20_000);
    gameStore.dismissWager();
    expect(gameStore.placeWager('royale', 100)).toBe(false);
  });

  it('rejects unknown theme and frame ids', () => {
    gameStore.purchasePro();
    gameStore.setProTheme('neon-zebra');
    gameStore.setFlexFrame('cardboard');
    const s = gameStore.getSnapshot();
    expect(s.proTheme).toBe('gold');
    expect(s.flexFrame).toBe('classic');
  });
});
