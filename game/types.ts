/** Shared types for STRIDE. Local-first: this whole shape persists to localStorage. */

export interface EmpireAssetDef {
  id: string;
  name: string;
  emoji: string;
  baseOutputPerHour: number; // coins/hour per unit at full capacity
  baseCost: number;
  costGrowth: number; // exponential cost curve
}

export interface OwnedAsset {
  id: string;
  owned: number;
}

export type ShowroomTier =
  | 'Broke'
  | 'Comfortable'
  | 'Wealthy'
  | 'Rich'
  | 'Ultra'
  | 'Billionaire';

export interface ShowroomItem {
  id: string;
  name: string;
  emoji: string;
  tier: ShowroomTier;
  cost: number;
  signature?: boolean; // the one trophy that becomes your leaderboard badge for the tier
}

/** What STRIDE Pro unlocks. Every entry is convenience or cosmetic — NEVER earning power. */
export type ProPerk =
  | 'Extra Wager slots'
  | 'Stash of Streak Freezes'
  | 'Showroom themes & cosmetics'
  | 'Custom Flex Card frames'
  | 'A second Club slot';

export interface GameState {
  version: number;

  // Wallet
  coins: number;
  upgradeMult: number;
  eventMult: number;

  // Daily / streak
  stepsToday: number;
  /** All steps ever credited — drives the Empire Level ladder (progression.ts). */
  lifetimeSteps: number;
  /** Coins earned since the last day rollover (steps + idle + bonuses) — the
   *  "+X today" readout under net worth. */
  coinsToday: number;
  stepsYesterday: number;
  trailing7dMedian: number;
  comboDays: number;
  streakDays: number;
  streakFreezes: number;
  dayKey: string; // local YYYY-MM-DD this state is anchored to

  // Empire
  assets: OwnedAsset[];

  // Showroom (pure status by default — see README "push back")
  ownedItemIds: string[];

  // Loop bookkeeping
  lastTickMs: number;

  // ── Freemium ────────────────────────────────────────────────────────────────
  /** Real one-time "STRIDE Pro" entitlement (simulated purchase in this prototype). */
  proUnlocked: boolean;
  /** DEBUG master switch — opens every gate with no purchase. The "unlock everything
   *  to test" lever. Checked FIRST by `isProUnlocked()`. */
  debugUnlockEverything: boolean;
}
