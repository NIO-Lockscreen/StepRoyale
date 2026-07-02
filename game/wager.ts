/**
 * The daily wager (concept art: "RISK. REWARD. REPEAT.").
 *
 * Once per day the player can stake coins on walking EXTRA steps before midnight —
 * extra measured from the moment the wager is placed, so steps already banked can
 * never auto-win it. Higher tiers demand more legwork and pay bigger multipliers.
 *
 * Economy note: the payout is coins-for-steps, gated on real walking and limited to
 * one stake per day — it strengthens the "walking wins" invariant rather than
 * bypassing it.
 */

export type WagerTierId = 'safe' | 'bold' | 'royale';

export interface WagerTier {
  id: WagerTierId;
  label: string;
  emoji: string;
  /** Extra steps demanded, as a fraction of the daily goal. */
  extraGoalFraction: number;
  payoutMult: number;
}

export const WAGER_TIERS: WagerTier[] = [
  { id: 'safe',   label: 'Safe',   emoji: '🎯', extraGoalFraction: 0.4,  payoutMult: 1.5 },
  { id: 'bold',   label: 'Bold',   emoji: '⚡', extraGoalFraction: 0.75, payoutMult: 2 },
  { id: 'royale', label: 'Royale', emoji: '👑', extraGoalFraction: 1.25, payoutMult: 3 },
];

export const MIN_STAKE = 100;

export const wagerTier = (id: string) => WAGER_TIERS.find((t) => t.id === id);

/** Extra steps a tier demands for a given daily goal, rounded to a clean 50. */
export function wagerExtraSteps(dailyGoal: number, tier: WagerTier): number {
  return Math.ceil((dailyGoal * tier.extraGoalFraction) / 50) * 50;
}

/** Stake choices scaled to the wallet (10/25/50%), floored to 50s, min 100. */
export function stakePresets(coins: number): number[] {
  const nice = (v: number) => Math.max(MIN_STAKE, Math.floor(v / 50) * 50);
  return [...new Set([0.1, 0.25, 0.5].map((f) => nice(coins * f)))].filter((v) => v <= coins);
}
