import type { EmpireAssetDef, OwnedAsset } from './types';

/**
 * The idle empire (design doc §6): assets that generate coins/hour automatically,
 * throttled by capacity and then HARD-CLAMPED by the step invariant in selectors.
 * Raw output here can be anything — the clamp guarantees it can never out-earn walking.
 */
export const ASSET_DEFS: EmpireAssetDef[] = [
  { id: 'lemonade',   name: 'Lemonade Stand',   emoji: '🍋', baseOutputPerHour: 5,       baseCost: 50,          costGrowth: 1.15 },
  { id: 'foodtruck',  name: 'Food Truck',       emoji: '🚚', baseOutputPerHour: 40,      baseCost: 600,         costGrowth: 1.15 },
  { id: 'cafe',       name: 'Cafe',             emoji: '☕', baseOutputPerHour: 300,     baseCost: 7_000,       costGrowth: 1.15 },
  { id: 'startup',    name: 'Startup',          emoji: '💻', baseOutputPerHour: 2_200,   baseCost: 80_000,      costGrowth: 1.16 },
  { id: 'realestate', name: 'Real-Estate Fund', emoji: '🏙️', baseOutputPerHour: 16_000,  baseCost: 950_000,     costGrowth: 1.16 },
  { id: 'hedgefund',  name: 'Hedge Fund',       emoji: '📈', baseOutputPerHour: 120_000, baseCost: 12_000_000,  costGrowth: 1.17 },
  { id: 'space',      name: 'Space Company',    emoji: '🚀', baseOutputPerHour: 900_000, baseCost: 150_000_000, costGrowth: 1.18 },
];

export const assetDef = (id: string) => ASSET_DEFS.find((a) => a.id === id)!;

export const ownedCount = (assets: OwnedAsset[], id: string) =>
  assets.find((a) => a.id === id)?.owned ?? 0;

/** Cost of the next unit of an asset, given how many are already owned. */
export function nextCost(id: string, assets: OwnedAsset[]): number {
  const def = assetDef(id);
  return def.baseCost * Math.pow(def.costGrowth, ownedCount(assets, id));
}

/** Total uncapped, pre-capacity output. Fed into the invariant clamp downstream. */
export function rawOutputPerHour(assets: OwnedAsset[]): number {
  return ASSET_DEFS.reduce((sum, def) => sum + ownedCount(assets, def.id) * def.baseOutputPerHour, 0);
}

/** Returns a NEW assets array with one more of `id` (immutable update). */
export function withPurchased(assets: OwnedAsset[], id: string): OwnedAsset[] {
  const exists = assets.some((a) => a.id === id);
  return exists
    ? assets.map((a) => (a.id === id ? { ...a, owned: a.owned + 1 } : a))
    : [...assets, { id, owned: 1 }];
}
