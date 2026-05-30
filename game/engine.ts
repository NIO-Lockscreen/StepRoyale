import { useSyncExternalStore } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   STRIDE engine — ALL game logic + state in one file.

   THE PROMISE (load-bearing, now PER-DAY not just per-hour):
     The empire is a fuel tank filled by your real steps. Each day it can pay out
     at most `idleFuelRatio` (<1) of the coins your walking earned the day before,
     scaled by empire efficiency (<1). So idle income in a day is ALWAYS strictly
     less than the walking that fuels it — walking is never the worse way to earn.

   Why this is stronger than the old flat cap: capacity (yesterday's steps) now
   drives idle at EVERY empire size, and buying more empire raises efficiency
   toward the fuel ceiling — both levers stay alive. Proven in engine.test.ts.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Tuning (all illustrative knobs) ──────────────────────────────────────────
export const T = {
  baseRate: 0.1,        // coins per step at neutral mults (1k steps → 100 coins)
  cadenceSpm: 100,      // "active walking" steps/min — the yardstick idle is measured against
  idleFuelRatio: 0.75,  // empire pays ≤ 75% of the walk that fuels it. Must be <1 ⇒ walking always wins
  empireK: 800,         // efficiency curve: eff = raw/(raw+K). Bigger empire → closer to the fuel ceiling
  activeH: 16,          // the fuel allowance drips over ~16 waking hours
  offlineCapH: 8,       // idle while away is capped → a reason to come back
  dailyStepCap: 100000, // anti-cheat: steps/day beyond this don't earn (implausible) (§11)
  goalLo: 4000,
  goalHi: 15000,
  prestigeMin: 1_000_000, // can Retire once net worth hits Rich
};
export const WAGER_TIERS = [
  { over: 0.5, mult: 1.8, label: '+50%' },
  { over: 1.0, mult: 2.5, label: '+100%' },
  { over: 2.0, mult: 4.0, label: '+200%' },
];
export const WAGER_MERCY = 0.05;   // finish within 5% of target → stake refunded
export const WAGER_MAX = 0.30;     // never stake more than 30% of balance

// ── Types ────────────────────────────────────────────────────────────────────
export type Tier = 'Broke' | 'Comfortable' | 'Wealthy' | 'Rich' | 'Ultra' | 'Billionaire';
export type Perk = 'Extra Wager slots' | 'Stash of Streak Freezes' | 'Showroom themes' | 'Flex Card frames' | 'Second Club';
export interface Asset { id: string; name: string; emoji: string; out: number; cost: number; grow: number }
export interface Upgrade { id: string; name: string; emoji: string; boost: number; cost: number; grow: number }
export interface Item { id: string; name: string; emoji: string; tier: Tier; cost: number; sig?: boolean }
export interface Wager { stake: number; target: number; mult: number; day: string }

export interface State {
  v: number;
  coins: number; eventMult: number;
  stepsToday: number; stepsYest: number; median7: number; lifeSteps: number;
  combo: number; streak: number; freezes: number; day: string;
  assets: Record<string, number>;    // assetId → owned count
  upgrades: Record<string, number>;  // upgradeId → level
  items: string[];                   // owned item ids
  idleToday: number;                 // idle coins already drawn from today's fuel tank
  wager: Wager | null; wagerWins: number;
  legacy: number; gen: number;       // prestige: cumulative retired net worth + generation
  achieved: string[];
  lastMs: number; firstMs: number;
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

// Permanent earning multipliers (boost both walking AND idle in lockstep → invariant-safe).
export const UPGRADES: Upgrade[] = [
  { id: 'shoes', name: 'Better Shoes',   emoji: '👟', boost: 0.5, cost: 500,         grow: 1.5 },
  { id: 'coach', name: 'Personal Coach', emoji: '🏋️', boost: 3,   cost: 30_000,      grow: 1.55 },
  { id: 'charm', name: 'Lucky Charm',    emoji: '📿', boost: 15,  cost: 2_000_000,   grow: 1.6 },
  { id: 'bio',   name: 'Bio-Hacks',      emoji: '🧬', boost: 75,  cost: 120_000_000, grow: 1.65 },
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

// Offline "rivals" leaderboard (§8 social-comparison hook without a backend). They grow
// over real time, so you must keep earning to stay ahead. Clearly local until Game Center.
const RIVALS: { name: string; base: number; rate: number }[] = [
  { name: 'Marcus', base: 2_500,      rate: 0.09 },
  { name: 'Priya',  base: 38_000,     rate: 0.07 },
  { name: 'Diego',  base: 450_000,    rate: 0.055 },
  { name: 'Sana',   base: 3_200_000,  rate: 0.045 },
  { name: 'Liam',   base: 70_000_000, rate: 0.035 },
  { name: 'Yuki',   base: 900_000_000,rate: 0.03 },
];

const ACHIEVEMENTS: { id: string; name: string; when: (s: State) => boolean; reward?: (s: State) => State }[] = [
  { id: 'firstAsset', name: 'First Business',     when: s => Object.values(s.assets).some(v => v > 0), reward: s => ({ ...s, coins: s.coins + 1000 }) },
  { id: 'firstItem',  name: 'First Flex',         when: s => s.items.length > 0 },
  { id: 'firstUp',    name: 'Self-Improvement',   when: s => Object.values(s.upgrades).some(v => v > 0) },
  { id: 'combo10',    name: 'On a Roll (×2)',     when: s => s.combo >= 10 },
  { id: 'wagerWin',   name: 'House Always Wins',  when: s => s.wagerWins >= 1 },
  { id: 'streak7',    name: 'Week Warrior',       when: s => s.streak >= 7, reward: s => ({ ...s, freezes: s.freezes + 1 }) },
  { id: 'rich',       name: 'Rolex Money',        when: s => netWorth(s) >= 1_000_000 },
  { id: 'retire',     name: 'Retired Early',      when: s => s.gen >= 1 },
  { id: 'billionaire',name: 'Ten Figures',        when: s => netWorth(s) >= 1_000_000_000 },
];

// ── Pure economy (the promise lives here) ────────────────────────────────────
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

export const goal = (s: State) => Math.round(clamp(s.median7 * 1.1, T.goalLo, T.goalHi));
export const comboMult = (combo: number) => Math.min(1 + 0.1 * combo, 3);
export const upgradeFactor = (s: State) => 1 + UPGRADES.reduce((n, u) => n + (s.upgrades[u.id] || 0) * u.boost, 0);
export const legacyMult = (s: State) => 1 + Math.sqrt(s.legacy / T.prestigeMin);
// One multiplier chain used by BOTH the step and idle sides ⇒ they move together.
export const earnMult = (s: State) => comboMult(s.combo) * s.eventMult * upgradeFactor(s) * legacyMult(s);
export const coinsForSteps = (steps: number, s: State) => steps * T.baseRate * earnMult(s);
export const walkPerHour = (s: State) => coinsForSteps(T.cadenceSpm * 60, s);                 // the yardstick (per hour)
export const capacity = (s: State) => clamp(s.stepsYest / goal(s), 0.1, 1.25);                // §6: shown to the player
export const assetCost = (a: Asset, s: State) => a.cost * a.grow ** (s.assets[a.id] || 0);
export const upgradeCost = (u: Upgrade, s: State) => u.cost * u.grow ** (s.upgrades[u.id] || 0);
export const rawIdle = (s: State) => ASSETS.reduce((n, a) => n + (s.assets[a.id] || 0) * a.out, 0);

// THE FUEL MODEL — the heart of the fix.
export const empireEff = (s: State) => { const r = rawIdle(s); return r / (r + T.empireK); };           // ∈ [0,1): bigger empire captures more fuel
export const walkDayEarnings = (s: State) => coinsForSteps(s.stepsYest, s);                              // the walk that fuels today
export const idleAllowance = (s: State) => T.idleFuelRatio * walkDayEarnings(s) * empireEff(s);          // max idle this whole day (< walk that fuels it)
export const idleFuelLeft = (s: State) => Math.max(0, idleAllowance(s) - s.idleToday);                   // tank remaining today
export const idlePerHour = (s: State) => (idleFuelLeft(s) > 0 ? idleAllowance(s) / T.activeH : 0);       // drip rate while fuel remains
// The promise, made checkable: a day's idle can never reach the walking that fuels it.
export const invariantOk = (s: State) => walkDayEarnings(s) === 0 || idleAllowance(s) < walkDayEarnings(s);

export const netWorth = (s: State) => s.coins + ITEMS.filter(i => s.items.includes(i.id)).reduce((n, i) => n + i.cost, 0);
export const tierOf = (s: State): Tier => { let t: Tier = 'Broke'; for (const x of TIERS) if (netWorth(s) >= TIER_MIN[x]) t = x; return t; };
export const signatureTrophy = (s: State) => [...ITEMS].reverse().find(i => i.sig && s.items.includes(i.id));
export const nextItem = (s: State) => { const left = ITEMS.filter(i => !s.items.includes(i.id)); return left.sort((a, b) => a.cost - b.cost).find(i => i.cost > s.coins) ?? left[0]; };
export const canRetire = (s: State) => netWorth(s) >= T.prestigeMin;

export function rivals(s: State): { name: string; net: number; you?: boolean }[] {
  const days = Math.max(0, (Date.now() - s.firstMs) / 8.64e7);
  const list = RIVALS.map(r => ({ name: r.name, net: r.base * (1 + r.rate) ** days }));
  return [...list, { name: 'You', net: netWorth(s), you: true }].sort((a, b) => b.net - a.net);
}

const U = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : ''; let x = Math.abs(n);
  if (x < 1000) return sign + Math.floor(x);
  let u = 0; while (x >= 1000 && u < U.length - 1) { x /= 1000; u++; }
  return sign + x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0) + U[u];
}
export const pct = (x: number) => Math.round(x * 100) + '%';

// ── Ephemeral UI event bus (toasts / coin floaters / offline modal — never persisted) ──
export type BusEvent =
  | { type: 'toast'; msg: string; kind: 'good' | 'bad' | 'info' }
  | { type: 'gain'; amount: number }
  | { type: 'offline'; coins: number; hours: number };
const busL = new Set<(e: BusEvent) => void>();
export const bus = {
  on: (f: (e: BusEvent) => void) => { busL.add(f); return () => { busL.delete(f); }; },
  emit: (e: BusEvent) => busL.forEach(f => f(e)),
  toast: (msg: string, kind: 'good' | 'bad' | 'info' = 'info') => bus.emit({ type: 'toast', msg, kind }),
};

// ── Persistence (local-first, §15; guarded so node/tests don't touch localStorage) ──
const VER = 3;
const KEY = 'stride.v3';
const hasLS = typeof localStorage !== 'undefined';
export const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const initial = (): State => ({
  v: VER, coins: 500, eventMult: 1,                       // §12: seed coins so first buy is instant
  stepsToday: 0, stepsYest: 6000, median7: 4000, lifeSteps: 0,  // stepsYest>0 ⇒ the empire has fuel on a fresh install
  combo: 0, streak: 0, freezes: 1, day: today(),
  assets: {}, upgrades: {}, items: [], idleToday: 0,
  wager: null, wagerWins: 0, legacy: 0, gen: 0, achieved: [],
  lastMs: Date.now(), firstMs: Date.now(), pro: false, debugUnlockAll: false,
});
const load = (): State | null => { if (!hasLS) return null; try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s?.v === VER ? s : null; } catch { return null; } };
const save = (s: State) => { if (hasLS) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* full/disabled */ } };

// ── Step sources (the seam; swap-only for iOS — see boot()) ───────────────────
export interface StepSource { onSteps?: (delta: number) => void; start(): void | Promise<void>; stop(): void }
export class SimSteps implements StepSource {
  onSteps?: (delta: number) => void;
  private t: any = null;
  start() { this.t ??= setInterval(() => this.onSteps?.(20 + Math.floor(Math.random() * 40)), 2000); }
  stop() { clearInterval(this.t); this.t = null; }
}

// Day rollover: refill the fuel tank, settle wager, fire streak milestones, advance/reset combo.
function roll(s: State, day: string): State {
  const hit = s.stepsToday >= goal(s);
  let { combo, streak, freezes, coins, wager, wagerWins } = s;
  if (hit) { combo++; streak++; } else if (freezes > 0) freezes--; else combo = 0;   // a freeze protects the combo

  if (hit) {                                                                          // §4.3 streak milestone drops
    const ms: Record<number, [number, number]> = { 7: [5_000, 1], 30: [50_000, 1], 100: [500_000, 2], 365: [5_000_000, 3] };
    const m = ms[streak];
    if (m) { coins += m[0]; freezes += m[1]; bus.toast(`🔥 ${streak}-day streak! +${fmt(m[0])} & a Freeze`, 'good'); }
  }
  if (wager) {                                                                        // §4.4 settle the bet
    if (s.stepsToday >= wager.target) { const pay = wager.stake * wager.mult; coins += pay; wagerWins++; bus.toast(`🎰 Wager WON! +${fmt(pay)}`, 'good'); }
    else if (s.stepsToday >= wager.target * (1 - WAGER_MERCY)) { coins += wager.stake; bus.toast('😤 SO close — stake refunded', 'info'); }  // Mercy Near-Miss
    else bus.toast('🎰 Wager lost — get them tomorrow', 'bad');
    wager = null;
  }
  // stepsYest = the day just ended → it fuels tomorrow's empire. idleToday resets (fresh tank).
  return { ...s, combo, streak, freezes, coins, wager, wagerWins, stepsYest: s.stepsToday, stepsToday: 0, idleToday: 0, day };
}

// ── Store: the single source of truth + the game loop ────────────────────────
class Store {
  s: State = load() ?? initial();
  private ls = new Set<() => void>();
  private loop: any = null;

  get = () => this.s;
  sub = (l: () => void) => { this.ls.add(l); return () => this.ls.delete(l); };
  // Commit + award any newly-earned achievements in the same pass.
  private set(p: Partial<State>) {
    let next = { ...this.s, ...p };
    const won = ACHIEVEMENTS.filter(a => !next.achieved.includes(a.id) && a.when(next));
    if (won.length) {
      next = { ...next, achieved: [...next.achieved, ...won.map(a => a.id)] };
      for (const a of won) { if (a.reward) next = a.reward(next); bus.toast(`🏆 ${a.name}`, 'good'); }
    }
    this.s = next; save(next); this.ls.forEach(l => l());
  }

  start() { if (this.loop) return; this.loop = setInterval(() => this.tick(), 1000); }
  private tick() {
    const now = Date.now(), s = this.s;
    const next = this.settle(s, now);
    this.s = next; save(next); this.ls.forEach(l => l());
  }
  // Credit fuel-limited idle for elapsed time + roll the day if the date changed. Pure-ish.
  private settle(s: State, now: number): State {
    let st = s;
    const k = today(new Date(now));
    if (k !== st.day) st = roll(st, k);                                   // refills the tank, sets stepsYest
    const dtH = Math.max(0, (now - st.lastMs) / 3.6e6);
    const gain = Math.min(idlePerHour(st) * dtH, idleFuelLeft(st));       // never exceed the day's fuel
    return { ...st, coins: st.coins + gain, idleToday: st.idleToday + gain, lastMs: now };
  }

  // Anti-cheat (§11): only plausible steps earn. Credit steps + emit a floating "+coins".
  steps(d: number) {
    if (!(d > 0)) return;
    const accept = Math.max(0, Math.min(d, T.dailyStepCap - this.s.stepsToday));
    if (accept <= 0) return;
    const g = coinsForSteps(accept, this.s);
    this.set({ stepsToday: this.s.stepsToday + accept, lifeSteps: this.s.lifeSteps + accept, coins: this.s.coins + g });
    bus.emit({ type: 'gain', amount: g });
  }
  buyAsset(id: string) { const a = ASSETS.find(x => x.id === id)!; const c = assetCost(a, this.s); if (this.s.coins >= c) this.set({ coins: this.s.coins - c, assets: { ...this.s.assets, [id]: (this.s.assets[id] || 0) + 1 } }); }
  buyUpgrade(id: string) { const u = UPGRADES.find(x => x.id === id)!; const c = upgradeCost(u, this.s); if (this.s.coins >= c) this.set({ coins: this.s.coins - c, upgrades: { ...this.s.upgrades, [id]: (this.s.upgrades[id] || 0) + 1 } }); }
  buyItem(id: string) { const i = ITEMS.find(x => x.id === id)!; if (!this.s.items.includes(id) && this.s.coins >= i.cost) this.set({ coins: this.s.coins - i.cost, items: [...this.s.items, id] }); }

  // §4.4 Wager: stake coins (≤30% balance) on hitting a stretch step goal today.
  placeWager(tier: number, frac: number) {
    if (this.s.wager) return;
    const t = WAGER_TIERS[tier];
    const stake = Math.floor(this.s.coins * Math.min(Math.max(frac, 0), WAGER_MAX));
    if (stake <= 0) return;
    const target = Math.round(goal(this.s) * (1 + t.over));
    this.set({ coins: this.s.coins - stake, wager: { stake, target, mult: t.mult, day: this.s.day } });
    bus.toast(`Bet ${fmt(stake)} on ${target.toLocaleString()} steps`, 'info');
  }

  // §9 Prestige: wipe coins/assets/upgrades for a permanent Legacy multiplier; flexes stay forever.
  retire() {
    if (!canRetire(this.s)) return;
    const banked = netWorth(this.s);
    const base = initial();
    const newLegacy = this.s.legacy + banked, newGen = this.s.gen + 1;
    this.set({ ...base, items: this.s.items, streak: this.s.streak, freezes: this.s.freezes, lifeSteps: this.s.lifeSteps,
      firstMs: this.s.firstMs, legacy: newLegacy, gen: newGen, wagerWins: this.s.wagerWins, achieved: this.s.achieved, day: this.s.day });
    bus.toast(`🎖️ Retired! Gen ${newGen} · Legacy ×${legacyMult({ ...base, legacy: newLegacy }).toFixed(2)}`, 'good');
  }

  // On return: settle offline idle (fuel- and time-capped) and reveal it for the modal.
  takeOffline(): { coins: number; hours: number } | null {
    const now = Date.now(), s = this.s;
    const gapH = (now - s.lastMs) / 3.6e6;
    const before = s.coins;
    // Cap the elapsed time used for crediting at offlineCapH, but still roll the date.
    const cappedNow = s.lastMs + Math.min(now - s.lastMs, T.offlineCapH * 3.6e6);
    let next = this.settle(s, cappedNow);
    next = { ...next, lastMs: now };
    const earned = next.coins - before;
    this.s = next; save(next); this.ls.forEach(l => l());
    return gapH >= 1 / 60 && earned > 0 ? { coins: earned, hours: gapH } : null;
  }

  // Cloud-save substitute (§6 fix): portable backup code so progress survives a cleared browser.
  exportSave(): string { try { return btoa(unescape(encodeURIComponent(JSON.stringify(this.s)))); } catch { return ''; } }
  importSave(code: string): boolean {
    try { const s = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); if (s?.v !== VER) return false; this.set(s); return true; }
    catch { return false; }
  }

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
  const off = store.takeOffline();
  if (off) bus.emit({ type: 'offline', coins: off.coins, hours: off.hours });
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
