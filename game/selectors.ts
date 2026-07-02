import type { GameState } from './types';
import {
  activeStepRatePerHour,
  adaptiveGoal,
  capacityFactor,
  clampedIdleRatePerHour,
  comboMultiplier,
  invariantHolds,
  type Multipliers,
} from './economy';
import { rawOutputPerHour } from './empire';
import {
  levelForSteps, nextUnlock, tierUnlocked, xpProgress,
} from './progression';
import { SHOWROOM_ITEMS, tierForNetWorth } from './showroom';
import { formatCoins, formatInt } from './format';

/** Pure read-models derived from state. Keeping these in one place means the invariant
 *  is computed identically everywhere it's shown. */

export const mults = (s: GameState): Multipliers => ({
  comboDays: s.comboDays,
  upgradeMult: s.upgradeMult,
  eventMult: s.eventMult,
});

export const dailyGoal = (s: GameState) => adaptiveGoal(s.trailing7dMedian);

export const combo = (s: GameState) => comboMultiplier(s.comboDays);

export const capacity = (s: GameState) =>
  capacityFactor(s.stepsYesterday, dailyGoal(s));

/** Coins/hour a walker earns right now — the yardstick. */
export const walkRatePerHour = (s: GameState) => activeStepRatePerHour(mults(s));

/** Coins/hour the empire actually pays — already invariant-clamped below walking. */
export const idleRatePerHour = (s: GameState) =>
  clampedIdleRatePerHour(rawOutputPerHour(s.assets) * capacity(s), mults(s));

export const invariantOk = (s: GameState) =>
  invariantHolds(idleRatePerHour(s), mults(s));

/** Net worth = liquid coins + value of owned status items. */
export const netWorth = (s: GameState) =>
  s.coins +
  SHOWROOM_ITEMS.filter((i) => s.ownedItemIds.includes(i.id)).reduce(
    (sum, i) => sum + i.cost,
    0,
  );

export const tier = (s: GameState) => tierForNetWorth(netWorth(s));

export const goalProgress = (s: GameState) =>
  Math.min(s.stepsToday / dailyGoal(s), 1);

export const goalHit = (s: GameState) => s.stepsToday >= dailyGoal(s);

// ── Empire Level (progression ladder) ────────────────────────────────────────

export const level = (s: GameState) => levelForSteps(s.lifetimeSteps);

export const levelXp = (s: GameState) => xpProgress(s.lifetimeSteps);

// ── The goal engine ──────────────────────────────────────────────────────────
// The player must ALWAYS see live goals with visible progress. Three lanes,
// each pointing at a different loop: today (streak), the ladder (levels),
// and the flex (showroom). At least one is always active.

export interface Goal {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  progress: number; // 0..1
  done?: boolean;
  tab: 'home' | 'empire' | 'showroom';
}

export function currentGoals(s: GameState): Goal[] {
  const goals: Goal[] = [];

  // 1 — Today. Hit the adaptive step goal; keeps streak + combo alive.
  const goal = dailyGoal(s);
  goals.push({
    id: 'daily',
    emoji: '🔥',
    title: goalHit(s) ? 'Daily goal smashed' : "Hit today's goal",
    detail: goalHit(s)
      ? `Streak safe · combo ×${combo(s).toFixed(1)} tomorrow`
      : `${formatInt(s.stepsToday)} / ${formatInt(goal)} steps`,
    progress: goalProgress(s),
    done: goalHit(s),
    tab: 'home',
  });

  // 2 — The ladder. Next Empire Level, framed by what it unlocks.
  const lvl = level(s);
  const unlock = nextUnlock(lvl);
  const xp = levelXp(s);
  goals.push({
    id: 'level',
    emoji: unlock?.emoji ?? '🛡️',
    title: unlock
      ? `Unlock ${unlock.name} at Level ${unlock.atLevel}`
      : `Reach Level ${lvl + 1}`,
    detail: `Level ${lvl} · ${formatInt(xp.into)} / ${formatInt(xp.span)} steps to next`,
    progress: Math.min(xp.into / xp.span, 1),
    tab: 'empire',
  });

  // 3 — The flex. Cheapest unowned showroom item in an unlocked tier.
  const flex = SHOWROOM_ITEMS
    .filter((i) => !s.ownedItemIds.includes(i.id) && tierUnlocked(i.tier, lvl))
    .sort((a, b) => a.cost - b.cost)[0];
  if (flex) {
    goals.push({
      id: 'flex',
      emoji: flex.emoji,
      title: `Claim the ${flex.name}`,
      detail: `${formatCoins(s.coins)} / ${formatCoins(flex.cost)} coins`,
      progress: Math.min(s.coins / flex.cost, 1),
      done: s.coins >= flex.cost,
      tab: 'showroom',
    });
  }

  return goals;
}
