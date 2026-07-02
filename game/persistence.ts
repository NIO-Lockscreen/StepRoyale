import type { GameState } from './types';

const KEY = 'stride.save.v1';
const STATE_VERSION = 1;

/** Local-first persistence (design doc §15). Single source of truth, offline-proof. */
export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== STATE_VERSION) return null; // simple migration gate
    // Soft migration: fields added after a save was written get their defaults.
    return { ...initialState(), ...parsed };
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled — prototype tolerates it */
  }
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function initialState(): GameState {
  return {
    version: STATE_VERSION,
    // §12 endowed progress: arrive with seed coins so the first purchase is instant.
    coins: 500,
    upgradeMult: 1,
    eventMult: 1,
    stepsToday: 0,
    lifetimeSteps: 0,
    coinsToday: 0,
    stepsYesterday: 6000, // so the empire isn't at the 10% floor on a fresh install
    stepHistory: [4000], // seeds the adaptive-goal window, consistent with the median
    trailing7dMedian: 4000,
    comboDays: 0,
    streakDays: 0,
    streakFreezes: 1,
    dayKey: todayKey(),
    assets: [],
    ownedItemIds: [],
    wager: null,
    wagersPlacedToday: 0,
    proTheme: 'gold',
    flexFrame: 'classic',
    freezeStashMonth: '',
    freezeStashClaimed: 0,
    pendingLevelUp: null,
    awayRecap: null,
    lastTickMs: Date.now(),
    proUnlocked: false,
    debugUnlockEverything: false,
  };
}
