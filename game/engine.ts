import { useSyncExternalStore } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   STRIDE engine — ALL game logic + state in one file.

   THE RULE (load-bearing): idle income is always clamped below what you'd earn
   walking that same hour, under the same multipliers. Walking can never be the
   worse way to earn. Enforced in idlePerHour(); proven in engine.test.ts.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Tuning (all illustrative knobs) ──────────────────────────────────────────
export const T = {
  baseRate: 0.1,        // coins per step at neutral mults (1k steps → 100 coins)
  cadenceSpm: 100,      // "active walking" steps/min — the yardstick idle is measured against
  idleCeil: 0.5,        // idle/hr ≤ idleCeil × walk/hr. Must be <1 ⇒ walking always wins
  goalLo: 4000,
  goalHi: 15000,
};

// ── Types ────────────────────────────────────────────────────────────────────
export type Tier = 'Broke' | 'Comfortable' | 'Wealthy' | 'Rich' | 'Ultra' | 'Billionaire';
export type Perk = 'Extra Wager slots' | 'Stash of Streak Freezes' | 'Showroom themes' | 'Flex Card frames' | 'Second Club';
export interface Asset { id: string; name: string; emoji: string; out: number; cost: number; grow: number }
export interface Item { id: string; name: string; emoji: string; tier: Tier; cost: number; sig?: boolean }

export interface State {
  v: number;
  coins: number; upgradeMult: number; eventMult: number;
  stepsToday: number; stepsYest: number; median7: number;
  combo: number; streak: number; freezes: number; day: string;
  assets: Record<string, number>;   // assetId → owned count
  items: string[];                   // owned item ids
  lastMs: number;
  pro: boolean; debugUnlockAll: boolean;
}

// ── Static data ──────────────────────────────────────────────────────────────
export const ASSETS: Asset[] = [
  { id: 'lemonade',   name: 'Lemonade Stand',   emoji: '🍋',  out: 5,       cost: 50,          grow: 1.15 },
  { id: 'foodtruck',  name: 'Food Truck',       emoji: '🚚',  out: 40,      cost: 600,         grow: 1.15 },
  { id: 'cafe',       name: 'Cafe',             emoji: '☕',  out: 300,     cost: 7_000,       grow: 1.15 },
  { id: 'startup',    name: 'Startup',          emoji: '💻',  out: 2_200,   cost: 80_000,      grow: 1.16 },
  { id: 'realestate', name: 'Real-Estate Fund', emoji: '🏙️', out: 16_000,  cost: 950_000,     grow: 1.16 },
  { id: 'hedgefund',  name: 'Hedge Fund',       emoji: '📈',  out: 120_000, cost: 12_000_000,  grow: 1.17 },
  { id: 'space',      name: 'Space Company',    emoji: '🚀',  out: 900_000, cost: 150_000_000, grow: 1.18 },
];

export const ITEMS: Item[] = [
  { id: 'ramen',     name: 'Instant Ramen',   emoji: '🍜',  tier: 'Broke',       cost: 200 },
  { id: 'buspass',   name: 'Bus Pass',        emoji: '🎫',  tier: 'Broke',       cost: 800 },
  { id: 'thrifts',   name: 'Thrift Sneakers', emoji: '👟',  tier: 'Broke',       cost: 2_500,          sig: true },
  { id: 'niceshoes', name: 'Nice Shoes',      emoji: '👞',  tier: 'Comfortable', cost: 12_000 },
  { id: 'watch1',    name: 'Smartwatch',      emoji: '⌚',  tier: 'Comfortable', cost: 40_000 },
  { id: 'hatchback', name: 'Used Hatchback',  emoji: '🚗',  tier: 'Comfortable', cost: 90_000,         sig: true },
  { id: 'designer',  name: 'Designer Fit',    emoji: '🧥',  tier: 'Wealthy',     cost: 220_000 },
  { id: 'sedan',     name: 'Nice Sedan',      emoji: '🚙',  tier: 'Wealthy',     cost: 600_000 },
  { id: 'apartment', name: 'Downtown Apt',    emoji: '🏢',  tier: 'Wealthy',     cost: 950_000,        sig: true },
  { id: 'rolex',     name: 'The Rolex',       emoji: '⌚',  tier: 'Rich',        cost: 3_000_000,      sig: true },
  { id: 'sportscar', name: 'Sports Car',      emoji: '🏎️', tier: 'Rich',        cost: 9_000_000 },
  { id: 'beachhouse',name: 'Beach House',     emoji: '🏖️', tier: 'Rich',        cost: 20_000_000 },
  { id: 'supercars', name: 'Supercar Set',    emoji: '🚙',  tier: 'Ultra',       cost: 60_000_000 },
  { id: 'yacht',     name: 'Yacht',           emoji: '🛥️', tier: 'Ultra',       cost: 180_000_000 },
  { id: 'jet',       name: 'Private Jet',     emoji: '🛩️', tier: 'Ultra',       cost: 450_000_000,    sig: true },
  { id: 'island',    name: 'Private Island',  emoji: '🏝️', tier: 'Billionaire', cost: 700_000_000 },
  { id: 'spaceprog', name: 'Space Program',   emoji: '🛰️', tier: 'Billionaire', cost: 3_000_000_000 },
  { id: 'city',      name: 'A City, Named After You', emoji: '🏛️', tier: 'Billionaire', cost: 20_000_000_000, sig: true },
];

export const PERKS: Perk[] = ['Extra Wager slots', 'Stash of Streak Freezes', 'Showroom themes', 'Flex Card frames', 'Second Club'];
export const TIERS: Tier[] = ['Broke', 'Comfortable', 'Wealthy', 'Rich', 'Ultra', 'Billionaire'];
export const TIER_MIN: Record<Tier, number> = { Broke: 0, Comfortable: 5_000, Wealthy: 100_000, Rich: 1_000_000, Ultra: 25_000_000, Billionaire: 500_000_000 };
export const TIER_BLURB: Record<Tier, string> = {
  Broke: 'everyone starts here', Comfortable: "I'm getting somewhere", Wealthy: "I'm doing well",
  Rich: 'the first real flex ⭐', Ultra: 'absurd, aspirational', Billionaire: 'the endgame meme flex',
};

// ── Pure economy (the invariant lives here) ──────────────────────────────────
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

export const goal = (s: State) => Math.round(clamp(s.median7 * 1.1, T.goalLo, T.goalHi));
export const comboMult = (combo: number) => Math.min(1 + 0.1 * combo, 3);
export const coinsForSteps = (steps: number, s: State) => steps * T.baseRate * comboMult(s.combo) * s.upgradeMult * s.eventMult;
export const walkPerHour = (s: State) => coinsForSteps(T.cadenceSpm * 60, s);                 // the yardstick
export const capacity = (s: State) => clamp(s.stepsYest / goal(s), 0.1, 1.25);                // §6: empire runs at last walk
export const assetCost = (a: Asset, s: State) => a.cost * a.grow ** (s.assets[a.id] || 0);
export const rawIdle = (s: State) => ASSETS.reduce((n, a) => n + (s.assets[a.id] || 0) * a.out, 0);
export const idlePerHour = (s: State) => Math.min(rawIdle(s) * capacity(s), T.idleCeil * walkPerHour(s)); // THE CLAMP
export const invariantOk = (s: State) => idlePerHour(s) < walkPerHour(s);                     // strict ⇒ a step is always worth more
export const netWorth = (s: State) => s.coins + ITEMS.filter(i => s.items.includes(i.id)).reduce((n, i) => n + i.cost, 0);
export const tierOf = (s: State): Tier => { let t: Tier = 'Broke'; for (const x of TIERS) if (netWorth(s) >= TIER_MIN[x]) t = x; return t; };
export const nextItem = (s: State) => { const left = ITEMS.filter(i => !s.items.includes(i.id)); return left.sort((a, b) => a.cost - b.cost).find(i => i.cost > s.coins) ?? left[0]; };

const U = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : ''; let x = Math.abs(n);
  if (x < 1000) return sign + Math.floor(x);
  let u = 0; while (x >= 1000 && u < U.length - 1) { x /= 1000; u++; }
  return sign + x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0) + U[u];
}
export const pct = (x: number) => Math.round(x * 100) + '%';

// ── Persistence (local-first, §15; guarded so node/tests don't touch localStorage) ──
const KEY = 'stride.v1';
const hasLS = typeof localStorage !== 'undefined';
export const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const initial = (): State => ({
  v: 1, coins: 500, upgradeMult: 1, eventMult: 1,         // §12: seed coins so first buy is instant
  stepsToday: 0, stepsYest: 6000, median7: 4000,          // stepsYest>0 ⇒ empire isn't at the floor on install
  combo: 0, streak: 0, freezes: 1, day: today(),
  assets: {}, items: [], lastMs: Date.now(), pro: false, debugUnlockAll: false,
});
const load = (): State | null => { if (!hasLS) return null; try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s?.v === 1 ? s : null; } catch { return null; } };
const save = (s: State) => { if (hasLS) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* full/disabled */ } };

// ── Step sources (the seam; swap-only for iOS — see boot()) ───────────────────
export interface StepSource { onSteps?: (delta: number) => void; start(): void | Promise<void>; stop(): void }
export class SimSteps implements StepSource {
  onSteps?: (delta: number) => void;
  private t: any = null;
  start() { this.t ??= setInterval(() => this.onSteps?.(20 + Math.floor(Math.random() * 40)), 2000); }
  stop() { clearInterval(this.t); this.t = null; }
}

// Day rollover: bank the goal, advance/reset combo & streak (a freeze protects the combo).
const roll = (s: State, day: string): State => {
  let { combo, streak, freezes } = s;
  if (s.stepsToday >= goal(s)) { combo++; streak++; }
  else if (freezes > 0) freezes--;
  else combo = 0;
  return { ...s, combo, streak, freezes, stepsYest: s.stepsToday, stepsToday: 0, day };
};

// ── Store: the single source of truth + the game loop ────────────────────────
class Store {
  s: State = load() ?? initial();
  private ls = new Set<() => void>();
  private loop: any = null;

  get = () => this.s;
  sub = (l: () => void) => { this.ls.add(l); return () => this.ls.delete(l); };
  private set(p: Partial<State>) { this.s = { ...this.s, ...p }; save(this.s); this.ls.forEach(l => l()); }

  start() { if (this.loop) return; this.tick(); this.loop = setInterval(() => this.tick(), 1000); }
  private tick() {
    const now = Date.now(), s = this.s;
    let next: State = { ...s, coins: s.coins + idlePerHour(s) * ((now - s.lastMs) / 3.6e6), lastMs: now }; // invariant-safe idle
    const k = today(new Date(now));
    if (k !== s.day) next = roll(next, k);
    this.s = next; save(next); this.ls.forEach(l => l());
  }

  steps(d: number) { if (d > 0) this.set({ stepsToday: this.s.stepsToday + d, coins: this.s.coins + coinsForSteps(d, this.s) }); }
  buyAsset(id: string) { const a = ASSETS.find(x => x.id === id)!; const c = assetCost(a, this.s); if (this.s.coins >= c) this.set({ coins: this.s.coins - c, assets: { ...this.s.assets, [id]: (this.s.assets[id] || 0) + 1 } }); }
  buyItem(id: string) { const i = ITEMS.find(x => x.id === id)!; if (!this.s.items.includes(id) && this.s.coins >= i.cost) this.set({ coins: this.s.coins - i.cost, items: [...this.s.items, id] }); }

  // Freemium (§14A): one-time unlock; perks are cosmetic/convenience only. Debug switch opens all gates.
  proUnlocked = () => this.s.debugUnlockAll || this.s.pro;
  buyPro() { this.set({ pro: true }); }            // swap for StoreKit/RevenueCat on iOS
  unlockAll(on: boolean) { this.set({ debugUnlockAll: on }); }

  // Debug cheats
  give(n: number) { this.set({ coins: this.s.coins + n }); }
  freeze() { this.set({ freezes: this.s.freezes + 1 }); }
  rollNow() { this.set(roll(this.s, today(new Date(Date.now() + 864e5)))); }
  reset() { this.set(initial()); }
}

export const store = new Store();
export const useGame = () => useSyncExternalStore(store.sub, store.get);

// Wire the step source + start the loop. The ONE place the provider is chosen:
// real HealthKit inside a Capacitor iOS shell (lazy-loaded), simulator on web.
let booted = false;
export async function boot() {
  if (booted) return; booted = true;
  const cap = (globalThis as any).Capacitor;
  let src: StepSource = new SimSteps();
  if (cap?.isNativePlatform?.() && cap.getPlatform?.() === 'ios') {
    try { const { HealthSteps } = await import('./health'); src = new HealthSteps(); }
    catch (e) { console.warn('[STRIDE] HealthKit unavailable, simulating.', e); }
  }
  src.onSteps = d => store.steps(d);
  await src.start();
  store.start();
}
