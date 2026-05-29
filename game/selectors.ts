import type { GameState } from './types';
import {
  activeStepRatePerHour,
  adaptiveGoal,
  capacityFactor,
  clampedIdleRatePerHour,
  comboMultiplier,
  invariantHolds,
  type Multipliers,
} from './economy';
import { rawOutputPerHour } from './empire';
import { SHOWROOM_ITEMS, tierForNetWorth } from './showroom';

/** Pure read-models derived from state. Keeping these in one place means the invariant
 *  is computed identically everywhere it's shown. */

export const mults = (s: GameState): Multipliers => ({
  comboDays: s.comboDays,
  upgradeMult: s.upgradeMult,
  eventMult: s.eventMult,
});

export const dailyGoal = (s: GameState) => adaptiveGoal(s.trailing7dMedian);

export const combo = (s: GameState) => comboMultiplier(s.comboDays);

export const capacity = (s: GameState) =>
  capacityFactor(s.stepsYesterday, dailyGoal(s));

/** Coins/hour a walker earns right now — the yardstick. */
export const walkRatePerHour = (s: GameState) => activeStepRatePerHour(mults(s));

/** Coins/hour the empire actually pays — already invariant-clamped below walking. */
export const idleRatePerHour = (s: GameState) =>
  clampedIdleRatePerHour(rawOutputPerHour(s.assets) * capacity(s), mults(s));

export const invariantOk = (s: GameState) =>
  invariantHolds(idleRatePerHour(s), mults(s));

/** Net worth = liquid coins + value of owned status items. */
export const netWorth = (s: GameState) =>
  s.coins +
  SHOWROOM_ITEMS.filter((i) => s.ownedItemIds.includes(i.id)).reduce(
    (sum, i) => sum + i.cost,
    0,
  );

export const tier = (s: GameState) => tierForNetWorth(netWorth(s));

export const goalProgress = (s: GameState) =>
  Math.min(s.stepsToday / dailyGoal(s), 1);
