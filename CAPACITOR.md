# Shipping STRIDE to iOS with Capacitor

The game is a React/TS web app that runs in any browser today. Capacitor wraps that exact
build in a native iOS shell so it can go to the App Store and read **real** steps from
HealthKit. The architecture is already prepared for this — these steps are the glue.

> The `npx cap add ios` step **must run on a Mac with Xcode.** Everything before it is
> cross-platform.

## What's already wired

- **`game/engine.ts`** — the `StepSource` seam (`interface StepSource`, `SimSteps`), and
  `boot()`, which auto-selects the source: HealthKit inside the iOS shell, simulator on web.
  Also where freemium lives (`store.buyPro()` — repoint at StoreKit/RevenueCat for iOS).
- **`game/health.ts`** — the real `HealthSteps` source (polls HealthKit's cumulative step
  total and emits deltas). Lazy-loaded via a variable specifier, so the web build never
  pulls native code.
- **`capacitor.config.ts`** — appId `com.stride.app`, webDir `dist`.

## One-time setup (on a Mac)

```bash
# 1. Install Capacitor + the iOS platform
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/ios

# 2. Install a HealthKit plugin (the provider targets @perfood by default)
npm i @perfood/capacitor-healthkit

# 3. Build the web app and add the native iOS project
npm run build
npx cap add ios
npm run cap:sync       # cap sync ios

# 4. Open Xcode
npm run ios            # cap open ios
```

## In Xcode (required for HealthKit)

1. **Signing & Capabilities → + Capability → HealthKit.**
2. **Info.plist** — add a usage string (App Store will reject without it):
   - `NSHealthShareUsageDescription` =
     *"STRIDE turns your real steps into coins for your idle empire."*
3. Run on a real device (HealthKit returns no step data in the simulator).

## After any web change

```bash
npm run build && npm run cap:sync
```

## Notes

- If you pick a different HealthKit plugin, the only file to touch is
  `game/health.ts` — confirm the authorization + query calls match its API.
  The polling/delta logic around them is plugin-agnostic.
- Background step capture is free: HealthKit retroactively reports steps taken while the
  app was closed, so the "idle while you were away" mechanic needs no background mode for
  steps (you may still add Background App Refresh later for capacity recalcs/notifications,
  per design doc §15).
