import { useSyncExternalStore } from 'react';
import type { GameState, ProPerk } from './types';
import { initialState, loadState, saveState, todayKey } from './persistence';
import { coinsForSteps } from './economy';
import { nextCost, withPurchased } from './empire';
import { SHOWROOM_ITEMS } from './showroom';
import { dailyGoal, idleRatePerHour, mults } from './selectors';

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

    let next: GameState = { ...s, coins: s.coins + idle, lastTickMs: now };

    // Day rollover: bank the goal, advance/reset combo & streak.
    const key = todayKey(new Date(now));
    if (key !== s.dayKey) {
      next = this.rolloverInto(next, key);
    }
    this.commit(next);
  }

  private rolloverInto(s: GameState, newKey: string): GameState {
    const hitGoal = s.stepsToday >= dailyGoal(s);
    let { comboDays, streakDays, streakFreezes } = s;
    if (hitGoal) {
      comboDays += 1;
      streakDays += 1;
    } else if (streakFreezes > 0) {
      streakFreezes -= 1; // a freeze protects the combo (design doc §4.2)
    } else {
      comboDays = 0;
    }
    return {
      ...s,
      comboDays,
      streakDays,
      streakFreezes,
      stepsYesterday: s.stepsToday,
      stepsToday: 0,
      dayKey: newKey,
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Credit newly-reported steps (pushed by the StepProvider). The dopamine tick. */
  ingestSteps(delta: number) {
    if (delta <= 0) return;
    const s = this.state;
    this.patch({
      stepsToday: s.stepsToday + delta,
      coins: s.coins + coinsForSteps(delta, mults(s)),
    });
  }

  buyAsset(id: string): boolean {
    const s = this.state;
    const cost = nextCost(id, s.assets);
    if (s.coins < cost) return false;
    this.patch({ coins: s.coins - cost, assets: withPurchased(s.assets, id) });
    return true;
  }

  buyItem(id: string): boolean {
    const s = this.state;
    const item = SHOWROOM_ITEMS.find((i) => i.id === id);
    if (!item || s.ownedItemIds.includes(id) || s.coins < item.cost) return false;
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
    this.commit(this.rolloverInto(this.state, todayKey(new Date(Date.now() + 86_400_000))));
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
