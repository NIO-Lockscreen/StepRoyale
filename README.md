<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/75a7e4fd-c297-4411-a6a8-a2851c957e70

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## STRIDE — the prototype

This repo now contains a working, mobile-first **React/TS prototype** of STRIDE (the idle
walking-tycoon game). The core loop runs in the browser with simulated steps:

```bash
npm install
npm run dev     # play it — steps simulate automatically
npm test        # run the invariant proof (steps always out-earn idle)
```

**Where things live** (compact on purpose — cheap to read, easy to edit):
- `game/engine.ts` — **everything**: tuning, types, data, economy, persistence, the store
  + game loop, and the freemium gate. The invariant (`idlePerHour`) is the load-bearing bit.
- `game/engine.test.ts` — the proof that *steps are never a worse way to earn than idle*.
- `game/health.ts` — the real HealthKit step source (lazy-loaded on iOS only).
- `game/fx.ts` — the dopamine layer: dependency-free canvas confetti, Web-Audio chime,
  and haptics. Driven by `bus.celebrate(...)` from the win moments in `engine.ts`.
- `App.tsx` — the entire UI (all screens + the tycoon-themed shell).

**Highlights**
- The design promise is a **hard, tested invariant** in `game/engine.ts`, not a tuning
  value: the empire is a **fuel tank filled by your steps** — a day's idle can never
  reach the walking that fuels it (`idleAllowance < walkDayEarnings`), at any empire size.
  See `npm test`.
- **Freemium**: a one-time "STRIDE Pro" unlock (cosmetics/convenience only); `store.buyPro()`.
- **"Unlock everything to test"**: `Debug → 🔓 Unlock Everything` opens every gate.
- Architected to port to native iOS via the `StepSource` seam (HealthKit) + Capacitor.

📋 Full design-doc review and scorecard: **[DESIGN_REVIEW.md](DESIGN_REVIEW.md)**.

## Deploy to Vercel

The prototype is a static Vite build, so Vercel deploys it as-is:

1. Import the repo in Vercel — it auto-detects **Vite** via `vercel.json`.
2. Build command `npm run build`, output `dist` — both preconfigured.
3. No environment variables required.

The deployed site is **mobile-formatted** (safe-area-aware phone-width column that
centers on desktop, dynamic viewport height) and **fully testable**: the **Debug** tab is
intentionally left enabled so you can flip 🔓 **Unlock Everything** on the live URL.
Guard or remove it before a public launch.
