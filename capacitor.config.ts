/**
 * Capacitor config for the iOS shell (see CAPACITOR.md for the full setup).
 *
 * Deliberately written WITHOUT importing `CapacitorConfig` from `@capacitor/cli`, so the
 * web build and `tsc` stay green even before Capacitor is installed. The Capacitor CLI
 * reads this file fine as a plain default export.
 */
const config = {
  appId: 'com.stride.app',
  appName: 'STRIDE',
  webDir: 'dist',
  ios: {
    // Let our own safe-area CSS handle insets; keeps the dark theme edge-to-edge.
    contentInset: 'always',
  },
};

export default config;
