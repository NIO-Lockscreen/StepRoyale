/**
 * StepProvider abstraction (design doc §15).
 *
 * The game loop never talks to a step source directly — it subscribes to a provider that
 * pushes step *deltas*. This is the seam that keeps the iOS port a swap, not a rewrite:
 *   • Web prototype  -> SimulatedStepProvider (here) for instant testing anywhere.
 *   • Real device    -> a HealthKitStepProvider via Capacitor (e.g. @perfood/capacitor-
 *                       healthkit) or a native bridge, reading HKQuantityType.stepCount.
 *                       HealthKit retroactively reports steps taken while the app was
 *                       closed — that's what makes "idle while you were away" free.
 *
 * To go native later, implement this same interface against HealthKit and swap it in
 * `bootstrap.ts`. Nothing else in the game changes.
 */
export interface StepProvider {
  onSteps?: (delta: number) => void;
  start(): void | Promise<void>;
  stop(): void;
}

/** Dev/web source: emits a believable trickle of steps so the loop runs in any browser. */
export class SimulatedStepProvider implements StepProvider {
  onSteps?: (delta: number) => void;
  private handle: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.handle) return;
    this.handle = setInterval(() => {
      // ~human walking cadence in 2s windows
      this.onSteps?.(Math.floor(20 + Math.random() * 40));
    }, 2000);
  }

  stop() {
    if (this.handle) clearInterval(this.handle);
    this.handle = null;
  }
}
