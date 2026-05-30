# STRIDE — design-doc review & build status

You asked: *does this project hit the tasks in the design doc — or do them better?*
Here's the honest scorecard against `STRIDE_design_doc.md`, plus where this prototype
deliberately goes further.

## Stack reality check (read this first)

The repo is a **Google AI Studio export: React 19 + Vite + TypeScript web app**, and it
arrived as an empty scaffold (no `index.tsx`). The design doc plans a **native iOS**
app (HealthKit, Swift, StoreKit). Those don't match, so a decision was forced:

- **This prototype is built in your existing React/TS stack**, mobile-first, and runs in
  any browser **right now** — which is exactly what "let me unlock everything to test"
  needs. A pure-Swift app can't even build in this environment, and rebuilding from
  scratch would throw away your AI Studio work.
- It's architected so the **iOS ship is a swap, not a rewrite**: all step input goes
  through one `StepSource` seam in `game/engine.ts`. Wrap with **Capacitor** for the App
  Store and implement `HealthSteps` (already in `game/health.ts`) — nothing else changes.
  Freemium is one method (`store.buyPro()`) you can repoint at StoreKit/RevenueCat.

> **Layout note:** the code is intentionally consolidated for cheap AI-assisted editing —
> all logic + state in `game/engine.ts`, all UI in `App.tsx`, native steps in
> `game/health.ts`, the proof in `game/engine.test.ts`. Fewer files, fewer tokens, same game.

If you'd rather I redo this as literal native Swift, say so — all the game design and
economy math below ports directly.

## Your two hard requirements

### 1. "At no point should steps be a worse way to earn than idle rewards."

The doc treats this as a **tuning goal** (§6 capacity throttle). That's too weak. The
**fuel-tank model** in `game/engine.ts` makes it a hard, tested invariant — *and* fixes a
flaw an earlier flat-cap version had (where capacity stopped mattering for big empires and
idle dominated the per-day total):

- The empire is a **fuel tank filled by your steps.** Each day it may pay out at most
  `idleFuelRatio` (0.75) × the coins **yesterday's walking** earned, scaled by empire
  efficiency `raw/(raw+K) < 1`. So `idleAllowance < walkDayEarnings` **always** — a whole
  day of idle can never reach the walking that fuels it. (Stronger than the doc's per-hour
  framing: it holds for the daily total, which is how the game is actually lived.)
- **Capacity matters at every empire size now**: yesterday's steps scale the tank linearly,
  so 800 steps → ~60/day and 12k steps → ~894/day on the *same* hedge fund (a 15× spread).
- **Empire purchases always help**: efficiency climbs 0.6% → 99.9% as you buy, so idle/day
  rises with every asset instead of flat-lining at a cap.
- **Idle stops when the tank is empty** — no 24/7 free money; you must walk to refuel.
- `game/engine.test.ts` **proves it** across combo × upgrades × legacy × events × empire ×
  steps (10 tests). Shown live on Home as the "Empire fuel ⛽" bar + "Why walking wins".

### 2. Freemium with a prototype "buy to unlock" (your first IAP)

Implemented per the doc's recommended model (§14A): one **one-time, non-consumable
"STRIDE Pro"** unlock — no subscription (`store.buyPro()` + the Pro screen in `App.tsx`). Every
Pro perk is **convenience or cosmetic only** (extra wager slots, streak-freeze stash,
showroom themes, flex-card frames, a 2nd club). **Nothing Pro buys earns coins or rank**
— that protects the "fair flex" promise (§11), which *is* the product. The purchase flow
is simulated for the prototype and isolated behind one facade for easy StoreKit swap.

### 3. "Let me unlock everything to test."

`More → 🔓 Unlock Everything` (the Debug card in `App.tsx`). One toggle opens every gate with
no purchase. `store.proUnlocked()` checks it first, so all Pro perks read as owned. The
Debug card is intentionally left enabled so the live Vercel URL is fully testable (guard or
remove before a public launch). It also has +coins, +steps, next-day, +freeze, and reset.

## Coverage of the rest of the doc (Phase 0 MVP, §16)

| Doc system | Status | Where (all in `engine.ts` + `App.tsx`) |
|---|---|---|
| Steps → live coin conversion (§4.1) | ✅ ticking live | `SimSteps` + the store loop |
| Adaptive daily goal (§4.2) | ✅ | `goal()` (110% of 7-day median, 4k–15k) |
| Combo + multiplier (§4.2) | ✅ | `comboMult` (+0.1/day, cap ×3.0) |
| Empire + capacity (§6) | ✅ **fuel-tank model** | `idleAllowance`, `empireEff` |
| **Idle < steps guarantee** | ✅ **enforced + tested** | the headline |
| Streak + Streak Freeze (§4.3) | ✅ + milestones | `roll()` (freeze protects combo; 7/30/100/365 drops) |
| Wager + Mercy Near-Miss (§4.4) | ✅ | `placeWager` + Wager screen |
| Upgrades line (§4.5) | ✅ | `UPGRADES`, `upgradeFactor` |
| Showroom / lifestyle ladder (§7) | ✅ data + UI | `ITEMS`/`TIERS` + Showroom screen (signature trophies, tease) |
| Prestige / Legacy (§9) | ✅ | `retire()`, `legacyMult` |
| Social: Flex Card + leaderboard (§8) | ✅ local | `Social` screen (share + offline Rivals) |
| Endowed progress (§12) | ✅ | 500 seed coins, empire fuelled on install |
| Local-first save + backup (§15) | ✅ | `persistence` + export/import codes |
| Anti-cheat (§11) | ⚠️ partial | client `dailyStepCap`; server checks need a backend |
| Real HealthKit steps (§15) | ⛔ not on device | `health.ts` exists, never run on hardware |

## Where I'd push back on the doc

- **Materialist items are pure status here, not +1% vanity multipliers** (doc §7/§18.3).
  Pure status is cleaner, braver, and keeps the invariant story airtight (cosmetics can't
  nudge earning). Easy to add the multiplier later if you want to reduce buyer's remorse.
- The doc's "Showroom must be a room, not a list" (§7) is real but it's **Phase-1 art**.
  The ladder is fully modeled now; the rendered penthouse is a visual pass, not a
  blocker for validating whether the loop is addictive.
- **The Wager ships here** (the doc and I previously leaned toward deferring it for App
  Store risk). It's behind its own tab and fully guard-railed (30% cap, Mercy refund); fine
  for a web prototype, but reconsider gating it for the first TestFlight submission.

## Run it

```bash
npm install
npm run dev     # play it in the browser (steps simulate automatically)
npm test        # run the invariant proof
```

---

## Critical-review fixes (this pass)

A strict self-analysis flagged real flaws. Here's what was fixed vs. what's honestly still
out of reach in a web container.

**Fixed in code (verified):**
- **Idle out-earned walking per-day; capacity went dead for big empires.** Replaced the flat
  `min(raw, 0.5×walk/hr)` cap with the **fuel-tank model** above. Capacity now scales idle at
  every empire size; empire purchases always raise output; idle/day is provably < walk/day.
- **Empire purchases felt dead** (idle flat-lined at the cap). Efficiency curve `raw/(raw+K)`
  means every asset moves the needle (0.6% → 99.9%).
- **No anti-cheat** (§11). Added a plausible **daily step cap** (`dailyStepCap`); steps beyond
  it don't earn. (Server-side velocity/teleport checks still need a backend.)
- **localStorage-only save could vanish.** Added **backup/restore codes** (export/import) as a
  cloud-save stand-in until Game Center/iCloud.
- **No social / growth engine** (§8 — the actual business model). Added a **Flex Card** (native
  share / clipboard) and an **offline Rivals leaderboard** that grows over real time. (Real
  Game Center leaderboards + clubs still need the native shell + a thin backend.)
- **Two display bugs in `retire()`** (gen/legacy read post-mutation) — fixed and locked by
  reading values before the state write.

**Still honestly out of scope here (needs a Mac / device / backend — not fakeable in this env):**
- **Real HealthKit steps.** The provider exists (`game/health.ts`) but has never run on a
  device; every number here is still from `SimSteps`. This is the #1 unvalidated risk.
- **A true native iOS build.** Capacitor is wired (`CAPACITOR.md`) but not `cap add ios`'d.
- **Real anti-cheat / verified leaderboards**, cloud accounts, and the **14-day personal
  retention test** the doc (and the critique) demand before building further. Those are the
  honest gates the verdict still hangs on.
