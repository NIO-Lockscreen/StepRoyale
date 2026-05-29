import type { ShowroomItem, ShowroomTier } from './types';

/**
 * The rags-to-riches lifestyle ladder (design doc §7). Items are bought with coins and
 * are PURE STATUS by default — no earning power (keeps the invariant airtight). They are
 * the emotional payoff and, later, the Flex Card content that drives growth.
 *
 * The doc wants a "room, not a list" — that's Phase-1 art. Here the ladder is fully
 * data-modeled with tiers, costs, and one signature trophy per tier (the leaderboard badge).
 */
export const TIER_ORDER: ShowroomTier[] = [
  'Broke', 'Comfortable', 'Wealthy', 'Rich', 'Ultra', 'Billionaire',
];

export const TIER_BANDS: Record<ShowroomTier, { min: number; blurb: string }> = {
  Broke:       { min: 0,            blurb: 'everyone starts here' },
  Comfortable: { min: 5_000,        blurb: "I'm getting somewhere" },
  Wealthy:     { min: 100_000,      blurb: "I'm doing well" },
  Rich:        { min: 1_000_000,    blurb: 'the first real flex ⭐' },
  Ultra:       { min: 25_000_000,   blurb: 'absurd, aspirational' },
  Billionaire: { min: 500_000_000,  blurb: 'the endgame meme flex' },
};

export const SHOWROOM_ITEMS: ShowroomItem[] = [
  // Broke
  { id: 'ramen',     name: 'Instant Ramen',   emoji: '🍜', tier: 'Broke',       cost: 200 },
  { id: 'buspass',   name: 'Bus Pass',        emoji: '🎫', tier: 'Broke',       cost: 800 },
  { id: 'thrifts',   name: 'Thrift Sneakers', emoji: '👟', tier: 'Broke',       cost: 2_500, signature: true },
  // Comfortable
  { id: 'niceshoes', name: 'Nice Shoes',      emoji: '👞', tier: 'Comfortable', cost: 12_000 },
  { id: 'watch1',    name: 'Smartwatch',      emoji: '⌚', tier: 'Comfortable', cost: 40_000 },
  { id: 'hatchback', name: 'Used Hatchback',  emoji: '🚗', tier: 'Comfortable', cost: 90_000, signature: true },
  // Wealthy
  { id: 'designer',  name: 'Designer Fit',    emoji: '🧥', tier: 'Wealthy',     cost: 220_000 },
  { id: 'sedan',     name: 'Nice Sedan',      emoji: '🚙', tier: 'Wealthy',     cost: 600_000 },
  { id: 'apartment', name: 'Downtown Apt',    emoji: '🏢', tier: 'Wealthy',     cost: 950_000, signature: true },
  // Rich
  { id: 'rolex',     name: 'The Rolex',       emoji: '⌚', tier: 'Rich',        cost: 3_000_000, signature: true },
  { id: 'sportscar', name: 'Sports Car',      emoji: '🏎️', tier: 'Rich',        cost: 9_000_000 },
  { id: 'beachhouse',name: 'Beach House',     emoji: '🏖️', tier: 'Rich',        cost: 20_000_000 },
  // Ultra
  { id: 'supercars', name: 'Supercar Collection', emoji: '🚙', tier: 'Ultra',  cost: 60_000_000 },
  { id: 'yacht',     name: 'Yacht',           emoji: '🛥️', tier: 'Ultra',       cost: 180_000_000 },
  { id: 'jet',       name: 'Private Jet',     emoji: '🛩️', tier: 'Ultra',       cost: 450_000_000, signature: true },
  // Billionaire
  { id: 'island',    name: 'Private Island',  emoji: '🏝️', tier: 'Billionaire', cost: 700_000_000 },
  { id: 'spaceprog', name: 'Space Program',   emoji: '🛰️', tier: 'Billionaire', cost: 3_000_000_000 },
  { id: 'city',      name: 'A City, Named After You', emoji: '🏛️', tier: 'Billionaire', cost: 20_000_000_000, signature: true },
];

/** Net worth = liquid coins + value of owned showroom items (status assets count). */
export function tierForNetWorth(netWorth: number): ShowroomTier {
  let current: ShowroomTier = 'Broke';
  for (const t of TIER_ORDER) if (netWorth >= TIER_BANDS[t].min) current = t;
  return current;
}

/** The next still-locked item by ascending cost — the "shimmering at the edge" tease. */
export function nextLockedItem(ownedIds: string[], coins: number): ShowroomItem | undefined {
  return SHOWROOM_ITEMS
    .filter((i) => !ownedIds.includes(i.id))
    .sort((a, b) => a.cost - b.cost)
    .find((i) => i.cost > coins) ?? SHOWROOM_ITEMS.find((i) => !ownedIds.includes(i.id));
}
