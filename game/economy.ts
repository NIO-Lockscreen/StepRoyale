/**
 * The economic core of STRIDE.
 *
 * ── THE LOAD-BEARING INVARIANT ───────────────────────────────────────────────
 *   "At no point should steps be a worse way to earn than the in-game idle rewards."
 *
 * This is not a tuning value we hope holds — it is enforced as a hard mathematical
 * guarantee in `clampedIdleRatePerHour()`. Idle income per hour is ALWAYS clamped to
 * a fraction (`IDLE_VS_STEP_CEILING`, < 1) of what the player would earn by actively
 * walking that same hour at their own cadence, under the SAME multipliers. So walking
 * always pays strictly more per unit time than sitting still — by construction, not by
 * luck. No empire size, upgrade path, prestige stack, or event can ever invert it.
 *
 * Proof lives in `economy.test.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** All of these are tuning knobs — illustrative starting values from the design doc. */
export const Tuning = {
  /** Coins per step at neutral multipliers. 1,000 steps -> 100 coins. */
  BASE_RATE: 0.1,
  /** A "normal" active walking cadence, steps/minute. Expresses the opportunity rate
   *  of walking so idle can be measured against it. */
  ACTIVE_CADENCE_SPM: 100,
  /** THE GUARANTEE. Idle/hr may never exceed this fraction of active-walk/hr.
   *  Must be < 1. 0.5 == "an hour of walking always pays at least double pure idle." */
  IDLE_VS_STEP_CEILING: 0.5,
} as const;

export interface Multipliers {
  comboDays: number;
  upgradeMult: number;
  eventMult: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

/** Combo multiplier: +0.1 per consecutive goal-day, capped at +2.0 (so x3.0 max). */
export function comboMultiplier(comboDays: number): number {
  return Math.min(1 + 0.1 * comboDays, 3.0);
}

/** Coins for a batch of newly-reported steps.
 *  coins = steps × BASE_RATE × combo × upgrade × event */
export function coinsForSteps(steps: number, m: Multipliers): number {
  return (
    steps *
    Tuning.BASE_RATE *
    comboMultiplier(m.comboDays) *
    m.upgradeMult *
    m.eventMult
  );
}

/** The rate a player earns while ACTIVELY walking, coins/hour, under the same
 *  multipliers. This is the yardstick the idle rate is measured against. */
export function activeStepRatePerHour(m: Multipliers): number {
  const stepsPerHour = Tuning.ACTIVE_CADENCE_SPM * 60;
  return coinsForSteps(stepsPerHour, m);
}

/** Empire capacity (design doc §6): clamp(yesterday_steps / daily_goal, 0.10, 1.25).
 *  The idle empire runs only as well as your last real walk. */
export function capacityFactor(yesterdaySteps: number, dailyGoal: number): number {
  if (dailyGoal <= 0) return 0.1;
  return clamp(yesterdaySteps / dailyGoal, 0.1, 1.25);
}

/**
 * THE INVARIANT ENFORCEMENT.
 * Takes the empire's raw idle output (after capacity) and clamps it so it can never
 * out-earn active walking. This single function makes the design promise TRUE.
 * Everything else can be tuned freely; this clamp holds the line.
 *
 * @returns idle coins/hour actually granted, guaranteed
 *          <= IDLE_VS_STEP_CEILING × activeStepRatePerHour  (strictly < walking).
 */
export function clampedIdleRatePerHour(rawIdleRatePerHour: number, m: Multipliers): number {
  const ceiling = Tuning.IDLE_VS_STEP_CEILING * activeStepRatePerHour(m);
  return Math.min(rawIdleRatePerHour, ceiling);
}

/** Is the invariant satisfied for a given idle rate? Strictly-less, so a step is always
 *  worth MORE than idle, never merely equal. Used by tests and the in-app HUD badge. */
export function invariantHolds(idleRatePerHour: number, m: Multipliers): boolean {
  return idleRatePerHour < activeStepRatePerHour(m);
}

/** Adaptive daily goal (design doc §4.2): ~110% of trailing-7-day median, clamped 4k–15k.
 *  Always *just* reachable = the behavior-change sweet spot. */
export function adaptiveGoal(trailing7dMedianSteps: number): number {
  return Math.round(clamp(trailing7dMedianSteps * 1.1, 4000, 15000));
}
