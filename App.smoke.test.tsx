// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Tell React this is a valid act() environment (silences the dev-only warning).
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A render smoke test: mounting <App/> exercises every screen's import graph (store,
 * selectors, economy, empire, showroom, format) and the whole component tree. If any of
 * it throws at runtime — a bad import, a selector crash, a null deref — this fails. It's
 * the cheap proof that the deployed Vercel build will actually render.
 */
describe('App renders', () => {
  it('mounts the STRIDE shell without throwing', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('STRIDE');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
