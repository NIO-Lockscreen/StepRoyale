import { gameStore } from './store';
import { SimulatedStepProvider, type StepProvider } from './steps';

/**
 * Wires the step source into the store and starts the game loop. This is the ONE place
 * to swap providers for the native build:  `new HealthKitStepProvider()` instead of the
 * simulated one — nothing else changes.
 */
let started = false;
let provider: StepProvider | null = null;

export function bootstrap() {
  if (started) return;
  started = true;

  provider = new SimulatedStepProvider();
  provider.onSteps = (delta) => gameStore.ingestSteps(delta);
  void provider.start();

  gameStore.startLoop();
}
