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

## STEP ROYALE — the prototype

This repo contains a working, mobile-first **React/TS prototype** of STEP ROYALE (the
walking-tycoon game, formerly STRIDE). The core loop runs in the browser with simulated
steps:

```bash
npm install
npm run dev     # play it — steps simulate automatically
npm test        # run the invariant proof (steps always out-earn idle)
```

**Highlights**
- The design promise — *steps are never a worse way to earn than idle* — is a **hard,
  tested invariant** in `game/economy.ts`, not just a tuning value. See `npm test`.
- **Always a next thing**: an **Empire Level** ladder driven by lifetime steps
  (`game/progression.ts`). Every level unlocks an empire asset or a showroom tier, and
  the Home screen's goal engine always shows three live goals — today's step goal, the
  next level unlock, and the next flex.
- **Freemium**: a one-time "Royale Pro" unlock (cosmetics/convenience only) in
  `game/iap.ts` / `components/Store.tsx`.
- **"Unlock everything to test"**: `Debug → 🔓 Unlock Everything` opens every gate.
- Architected to port to native iOS via the `StepProvider` seam (HealthKit) + Capacitor.

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
