import { ASSET_DEFS } from './empire';
import { TIER_ORDER } from './showroom';
import type { ShowroomTier } from './types';

/**
 * Empire Level — the spine of "always a next thing" (concept art: LEVEL UP YOUR EMPIRE).
 *
 * Levels are derived purely from lifetime steps, so the ladder can never desync from
 * the thing we actually care about: real-world walking. Every level unlocks something
 * concrete (an empire asset or a showroom tier) and pays a coin bonus, so the next
 * rung is always visible and always worth reaching.
 */

export const MAX_LEVEL = 99;

/** Total lifetime steps required to REACH a level. Quadratic: early levels land in the
 *  first sessions (hook), later ones take real weeks of walking (retention). */
export function stepsForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(1500 * Math.pow(level - 1, 2));
}

export function levelForSteps(lifetimeSteps: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && lifetimeSteps >= stepsForLevel(lvl + 1)) lvl++;
  return lvl;
}

/** Coin bonus paid the moment a level is reached. */
export const levelUpBonus = (level: number) => 250 * level;

/** XP display: steps walked into the current level vs. steps the level spans. */
export function xpProgress(lifetimeSteps: number): { into: number; span: number } {
  const lvl = levelForSteps(lifetimeSteps);
  const floor = stepsForLevel(lvl);
  const next = stepsForLevel(Math.min(lvl + 1, MAX_LEVEL));
  return { into: lifetimeSteps - floor, span: Math.max(next - floor, 1) };
}

// ── Unlock gates ──────────────────────────────────────────────────────────────
// Everything on the ladder opens at a level. Locked things stay visible — the
// concept art's "keep stepping to unlock" tease — so there is always a carrot.

export const ASSET_UNLOCK_LEVEL: Record<string, number> = {
  lemonade: 1,
  foodtruck: 2,
  cafe: 3,
  startup: 5,
  realestate: 7,
  hedgefund: 10,
  space: 14,
};

export const TIER_UNLOCK_LEVEL: Record<ShowroomTier, number> = {
  Broke: 1,
  Comfortable: 2,
  Wealthy: 4,
  Rich: 6,
  Ultra: 9,
  Billionaire: 13,
};

export const assetUnlocked = (assetId: string, level: number) =>
  level >= (ASSET_UNLOCK_LEVEL[assetId] ?? 1);

export const tierUnlocked = (tier: ShowroomTier, level: number) =>
  level >= TIER_UNLOCK_LEVEL[tier];

export interface UpcomingUnlock {
  name: string;
  emoji: string;
  atLevel: number;
  kind: 'asset' | 'tier';
}

/** The nearest thing still locked above `level` — what the next level-up is FOR. */
export function nextUnlock(level: number): UpcomingUnlock | undefined {
  const candidates: UpcomingUnlock[] = [
    ...ASSET_DEFS.filter((d) => (ASSET_UNLOCK_LEVEL[d.id] ?? 1) > level).map((d) => ({
      name: d.name,
      emoji: d.emoji,
      atLevel: ASSET_UNLOCK_LEVEL[d.id] ?? 1,
      kind: 'asset' as const,
    })),
    ...TIER_ORDER.filter((t) => TIER_UNLOCK_LEVEL[t] > level).map((t) => ({
      name: `${t} Showroom`,
      emoji: '💎',
      atLevel: TIER_UNLOCK_LEVEL[t],
      kind: 'tier' as const,
    })),
  ];
  return candidates.sort((a, b) => a.atLevel - b.atLevel)[0];
}
