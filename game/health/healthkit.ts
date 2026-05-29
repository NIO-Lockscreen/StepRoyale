import type { StepProvider } from '../steps';

/**
 * Real step source for the native iOS build (design doc §15).
 *
 * This is the ONE file that talks to HealthKit. It implements the same `StepProvider`
 * interface as the web simulator, so swapping it in (done automatically in
 * `bootstrap.ts` when running inside the Capacitor iOS shell) changes nothing else.
 *
 * ── How it works ─────────────────────────────────────────────────────────────
 * HealthKit exposes step count as a *cumulative* quantity. So we poll the running
 * total for "today", diff it against the last reading, and emit the delta — exactly
 * the shape the game loop wants. HealthKit also reports steps taken while the app was
 * closed, which is what makes the "idle while you were away" mechanic free.
 *
 * ── Wiring it up (on a Mac, once) ────────────────────────────────────────────
 *   npm i @perfood/capacitor-healthkit          # or another HealthKit plugin
 *   npx cap sync ios
 * Then confirm the plugin's read call below matches its current API (the rest is
 * plugin-agnostic). See CAPACITOR.md.
 */
export class HealthKitStepProvider implements StepProvider {
  onSteps?: (delta: number) => void;

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTotal: number | null = null;
  private readonly pollMs = 5000;

  async start(): Promise<void> {
    const plugin = await loadHealthKitPlugin();
    if (!plugin) {
      console.warn('[STRIDE] HealthKit plugin not found — install one (see CAPACITOR.md).');
      return;
    }
    try {
      await requestStepAuthorization(plugin);
    } catch (err) {
      console.warn('[STRIDE] HealthKit authorization denied or failed.', err);
      return;
    }
    // Seed the baseline so the first poll doesn't dump the whole day at once.
    this.lastTotal = await safeReadStepsToday(plugin);
    this.timer = setInterval(() => void this.poll(plugin), this.pollMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async poll(plugin: HealthKitPluginLike): Promise<void> {
    const total = await safeReadStepsToday(plugin);
    if (this.lastTotal == null) {
      this.lastTotal = total;
      return;
    }
    const delta = Math.max(0, Math.round(total - this.lastTotal));
    this.lastTotal = total;
    if (delta > 0) this.onSteps?.(delta);
  }
}

// ── Plugin adapter ─────────────────────────────────────────────────────────────
// Kept loosely typed and dynamically imported so the web build never pulls native code
// and `tsc` doesn't require the plugin to be installed.

type HealthKitPluginLike = Record<string, any>;

async function loadHealthKitPlugin(): Promise<HealthKitPluginLike | null> {
  const pkg = '@perfood/capacitor-healthkit';
  try {
    // Variable specifier + @vite-ignore: Vite won't try to bundle/resolve this optional
    // native dependency during the web build.
    const mod: any = await import(/* @vite-ignore */ pkg);
    return mod.CapacitorHealthkit ?? mod.default ?? mod;
  } catch {
    return null;
  }
}

async function requestStepAuthorization(plugin: HealthKitPluginLike): Promise<void> {
  // @perfood API; adjust the key if you choose a different plugin.
  await plugin.requestAuthorization?.({
    all: [],
    read: ['steps'],
    write: [],
  });
}

async function safeReadStepsToday(plugin: HealthKitPluginLike): Promise<number> {
  try {
    return await readStepsToday(plugin);
  } catch (err) {
    console.warn('[STRIDE] HealthKit step read failed.', err);
    return 0;
  }
}

async function readStepsToday(plugin: HealthKitPluginLike): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();

  // @perfood/capacitor-healthkit shape; confirm against your plugin's docs.
  const res: any = await plugin.queryHKitSampleType?.({
    sampleName: 'stepCount',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    limit: 0,
  });

  const samples: any[] = res?.resultData ?? res?.countReturn ?? [];
  return samples.reduce((sum, s) => sum + (Number(s?.value ?? s?.count ?? 0) || 0), 0);
}
