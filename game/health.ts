import type { StepSource } from './engine';

/**
 * Real step source for the native iOS shell. Same StepSource shape as the web sim, so
 * boot() swaps it in with nothing else changing. HealthKit reports a cumulative step
 * total (incl. steps taken while the app was closed), so we poll today's total and emit
 * deltas. This is the ONLY file that touches HealthKit — see CAPACITOR.md to wire it up.
 */
export class HealthSteps implements StepSource {
  onSteps?: (delta: number) => void;
  private timer: any = null;
  private last: number | null = null;

  async start() {
    const hk = await plugin();
    if (!hk) { console.warn('[STRIDE] No HealthKit plugin — see CAPACITOR.md'); return; }
    try { await hk.requestAuthorization?.({ all: [], read: ['steps'], write: [] }); }
    catch (e) { console.warn('[STRIDE] HealthKit auth failed', e); return; }
    this.last = await read(hk);
    this.timer = setInterval(async () => {
      const total = await read(hk);
      if (this.last == null) { this.last = total; return; }
      const d = Math.max(0, Math.round(total - this.last));
      this.last = total;
      if (d > 0) this.onSteps?.(d);
    }, 5000);
  }

  stop() { clearInterval(this.timer); this.timer = null; }
}

// Variable specifier (not a string literal) so neither tsc nor Rollup tries to resolve
// this optional native dep — the web build never sees it, lint stays green.
async function plugin(): Promise<any> {
  const pkg = '@perfood/capacitor-healthkit';
  try { const m: any = await import(/* @vite-ignore */ pkg); return m.CapacitorHealthkit ?? m.default ?? m; }
  catch { return null; }
}

async function read(hk: any): Promise<number> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  try {
    const r: any = await hk.queryHKitSampleType?.({ sampleName: 'stepCount', startDate: start.toISOString(), endDate: new Date().toISOString(), limit: 0 });
    const rows: any[] = r?.resultData ?? r?.countReturn ?? [];
    return rows.reduce((n, x) => n + (Number(x?.value ?? x?.count ?? 0) || 0), 0);
  } catch (e) { console.warn('[STRIDE] HealthKit read failed', e); return 0; }
}
