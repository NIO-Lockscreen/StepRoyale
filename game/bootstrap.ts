import { gameStore } from './store';
import { SimulatedStepProvider, type StepProvider } from './steps';

/**
 * Wires the step source into the store and starts the game loop.
 *
 * This is the ONE place the provider is chosen. On the web it's the simulator; inside the
 * Capacitor iOS shell it lazy-loads the real HealthKit provider. Native detection uses the
 * Capacitor global injected at runtime, so the web build needs ZERO Capacitor dependencies.
 */
let started = false;
let provider: StepProvider | null = null;

function isNativeIOS(): boolean {
  const cap = (globalThis as any).Capacitor;
  return !!cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios';
}

async function makeProvider(): Promise<StepProvider> {
  if (isNativeIOS()) {
    try {
      const { HealthKitStepProvider } = await import('./health/healthkit');
      return new HealthKitStepProvider();
    } catch (err) {
      console.warn('[STRIDE] Falling back to simulated steps.', err);
    }
  }
  return new SimulatedStepProvider();
}

export async function bootstrap(): Promise<void> {
  if (started) return;
  started = true;

  provider = await makeProvider();
  provider.onSteps = (delta) => gameStore.ingestSteps(delta);
  await provider.start();

  gameStore.startLoop();
}
