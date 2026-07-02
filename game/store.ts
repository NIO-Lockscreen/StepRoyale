import { useSyncExternalStore } from 'react';
import type { GameState, ProPerk } from './types';
import { initialState, loadState, saveState, todayKey } from './persistence';
import { coinsForSteps } from './economy';
import { applyRollover, daysBetween, rolloverToDay } from './day';
import { nextCost, withPurchased } from './empire';
import { SHOWROOM_ITEMS } from './showroom';
import {
  assetUnlocked, levelForSteps, levelUpBonus, tierUnlocked, unlocksAtLevel,
} from './progression';
import { dailyGoal, idleRatePerHour, mults } from './selectors';
import { MIN_STAKE, wagerExtraSteps, wagerTier, type WagerTierId } from './wager';

/** An absence long enough to deserve a "while you were away" recap. */
const AWAY_RECAP_MS = 10 * 60_000;

/** Convenience/cosmetic perks only — NEVER earning power (design doc §11/§14). */
export const PRO_PERKS: ProPerk[] = [
  'Extra Wager slots',
  'Stash of Streak Freezes',
  'Showroom themes & cosmetics',
  'Custom Flex Card frames',
  'A second Club slot',
];

/**
 * The single local-first source of truth. A tiny external store so React components
 * stay dumb and the game loop lives in exactly one place.
 */
class GameStore {
  private state: GameState;
  private listeners = new Set<() => void>();
  private loopHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = loadState() ?? initialState();
  }

  // ── React glue (useSyncExternalStore) ──────────────────────────────────────
  getSnapshot = (): GameState => this.state;
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private commit(next: GameState) {
    this.state = next;
    saveState(next);
    this.listeners.forEach((l) => l());
  }
  private patch(p: Partial<GameState>) {
    this.commit({ ...this.state, ...p });
  }

  // ── The game loop ──────────────────────────────────────────────────────────
  startLoop() {
    if (this.loopHandle) return;
    this.tick(); // settle anything that happened while away (idle + day rollover)
    this.loopHandle = setInterval(() => this.tick(), 1000);
  }

  private tick() {
    const now = Date.now();
    const s = this.state;
    const elapsedMs = Math.max(0, now - s.lastTickMs);

    // Idle income for the elapsed slice — ALWAYS the invariant-clamped rate.
    const idle = idleRatePerHour(s) * (elapsedMs / 3_600_000);

    let next: GameState = {
      ...s,
      coins: s.coins + idle,
      coinsToday: s.coinsToday + idle,
      lastTickMs: now,
    };

    // Day rollover — once PER missed day, so absences settle each day's streak,
    // freezes, wager, and adaptive-goal window individually.
    const key = todayKey(new Date(now));
    const daysAway = daysBetween(s.dayKey, key);
    if (key !== s.dayKey) {
      next = rolloverToDay(next, key);
    }

    // Coming back after a real absence gets a recap moment.
    if (elapsedMs >= AWAY_RECAP_MS && (idle >= 1 || daysAway >= 1)) {
      next = { ...next, awayRecap: { awayMs: elapsedMs, coins: idle, daysAway } };
    }
    this.commit(next);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Credit newly-reported steps (pushed by the StepProvider). The dopamine tick.
   *  Advances the Empire Level ladder (queueing the celebration) and resolves a
   *  live wager the moment its target is crossed. */
  ingestSteps(delta: number) {
    if (delta <= 0) return;
    const s = this.state;
    const earned = coinsForSteps(delta, mults(s));
    const lifetimeSteps = s.lifetimeSteps + delta;
    const stepsToday = s.stepsToday + delta;

    // Level-ups crossed by this batch: bank the bonus, queue the celebration.
    const prevLevel = levelForSteps(s.lifetimeSteps);
    const newLevel = levelForSteps(lifetimeSteps);
    let bonus = 0;
    const unlocks: { name: string; emoji: string }[] = [];
    for (let l = prevLevel + 1; l <= newLevel; l++) {
      bonus += levelUpBonus(l);
      unlocks.push(...unlocksAtLevel(l).map((u) => ({ name: u.name, emoji: u.emoji })));
    }
    const pendingLevelUp =
      newLevel > prevLevel ? { level: newLevel, bonus, unlocks } : s.pendingLevelUp;

    // A live wager pays out instantly when the target is crossed.
    let { wager } = s;
    let payout = 0;
    if (wager?.status === 'active' && stepsToday >= wager.targetSteps) {
      payout = wager.payout;
      wager = { ...wager, status: 'won' };
    }

    this.patch({
      stepsToday,
      lifetimeSteps,
      coins: s.coins + earned + bonus + payout,
      coinsToday: s.coinsToday + earned + bonus + payout,
      pendingLevelUp,
      wager,
    });
  }

  // ── Daily wager ─────────────────────────────────────────────────────────────

  /** Stake coins on walking EXTRA steps (from now) before midnight. One per day. */
  placeWager(tierId: WagerTierId, stake: number): boolean {
    const s = this.state;
    const tier = wagerTier(tierId);
    stake = Math.floor(stake);
    if (!tier || s.wager || s.wagerPlacedDay === s.dayKey) return false;
    if (stake < MIN_STAKE || stake > s.coins) return false;
    const extra = wagerExtraSteps(dailyGoal(s), tier);
    this.patch({
      coins: s.coins - stake,
      wager: {
        tierId,
        stake,
        payout: Math.round(stake * tier.payoutMult),
        baseSteps: s.stepsToday,
        targetSteps: s.stepsToday + extra,
        dayKey: s.dayKey,
        status: 'active',
      },
      wagerPlacedDay: s.dayKey,
    });
    return true;
  }

  /** Clear a settled (won/lost) wager banner. Active wagers can't be abandoned. */
  dismissWager() {
    const { wager } = this.state;
    if (wager && wager.status !== 'active') this.patch({ wager: null });
  }

  dismissLevelUp() {
    this.patch({ pendingLevelUp: null });
  }
  dismissRecap() {
    this.patch({ awayRecap: null });
  }

  buyAsset(id: string): boolean {
    const s = this.state;
    if (!assetUnlocked(id, levelForSteps(s.lifetimeSteps))) return false;
    const cost = nextCost(id, s.assets);
    if (s.coins < cost) return false;
    this.patch({ coins: s.coins - cost, assets: withPurchased(s.assets, id) });
    return true;
  }

  buyItem(id: string): boolean {
    const s = this.state;
    const item = SHOWROOM_ITEMS.find((i) => i.id === id);
    if (!item || s.ownedItemIds.includes(id) || s.coins < item.cost) return false;
    if (!tierUnlocked(item.tier, levelForSteps(s.lifetimeSteps))) return false;
    this.patch({ coins: s.coins - item.cost, ownedItemIds: [...s.ownedItemIds, id] });
    return true;
  }

  // ── Freemium ────────────────────────────────────────────────────────────────

  /** THE gate. Ask this, never the raw flag, so the debug switch is always honored. */
  isProUnlocked(): boolean {
    return this.state.debugUnlockEverything || this.state.proUnlocked;
  }
  hasAccess(_perk: ProPerk): boolean {
    return this.isProUnlocked();
  }
  /** Simulated one-time purchase. Real iOS build swaps this for StoreKit/RevenueCat. */
  purchasePro() {
    this.patch({ proUnlocked: true });
  }
  restorePurchases() {
    /* no-op in the prototype; real build calls AppStore.sync() */
  }
  setDebugUnlockEverything(on: boolean) {
    this.patch({ debugUnlockEverything: on });
  }

  // ── Debug helpers ─────────────────────────────────────────────────────────
  addCoins(n: number) { this.patch({ coins: this.state.coins + n }); }
  addSteps(n: number) { this.ingestSteps(n); }
  addStreakFreeze() { this.patch({ streakFreezes: this.state.streakFreezes + 1 }); }
  forceRollover() {
    // Settle the day but keep today's key, so the next tick doesn't roll AGAIN.
    this.commit(applyRollover(this.state, this.state.dayKey));
  }
  resetAll() {
    this.commit(initialState());
  }
}

export const gameStore = new GameStore();

/** React hook: subscribe a component to game state. */
export function useGame(): GameState {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);
}
