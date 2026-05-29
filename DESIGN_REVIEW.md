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
  through one `StepProvider` seam (`game/steps.ts`). Wrap with **Capacitor** for the App
  Store and implement a `HealthKitStepProvider` against that interface — nothing else
  changes. Freemium is behind one `IAP` facade you can repoint at StoreKit/RevenueCat.

If you'd rather I redo this as literal native Swift, say so — all the game design and
economy math below ports directly.

## Your two hard requirements

### 1. "At no point should steps be a worse way to earn than idle rewards."

The doc treats this as a **tuning goal** (§6 capacity throttle). That's too weak — tuning
drifts, and one aggressive upgrade or empire curve silently breaks the whole pitch. So I
promoted it to a **hard, tested invariant** in `game/economy.ts`:

- Idle income/hour is **always** clamped to `IDLE_VS_STEP_CEILING` (0.5) × the coins
  you'd earn **actively walking that same hour**, under the **same** combo/upgrade/event
  multipliers (`clampedIdleRatePerHour`).
- Because the clamp references the *same* multipliers that boost walking, no upgrade path,
  prestige stack, event, or empire size can ever invert the order. Walking is always
  **≥ 2× more efficient** than pure idle, by construction.
- `game/economy.test.ts` **proves it**: it sweeps combos, 1000× upgrades, events, and a
  one-billion-coin/hour empire and asserts idle stays strictly below walking. Run
  `npm test`. This is proof, not vibes — and it's stronger than the doc, which could
  still be broken by tuning.
- The guarantee is shown live in-app on the Home screen ("Why walking wins" → Walk/hr
  vs Idle/hr + a ✓/✗ invariant badge), so you can *see* it hold while you play.

### 2. Freemium with a prototype "buy to unlock" (your first IAP)

Implemented per the doc's recommended model (§14A): one **one-time, non-consumable
"STRIDE Pro"** unlock — no subscription (`game/iap.ts`, `components/Store.tsx`). Every
Pro perk is **convenience or cosmetic only** (extra wager slots, streak-freeze stash,
showroom themes, flex-card frames, a 2nd club). **Nothing Pro buys earns coins or rank**
— that protects the "fair flex" promise (§11), which *is* the product. The purchase flow
is simulated for the prototype and isolated behind one facade for easy StoreKit swap.

### 3. "Let me unlock everything to test."

`Debug → 🔓 Unlock Everything` (`components/Debug.tsx`). One toggle opens every gate with
no purchase. `gameStore.isProUnlocked()` checks it first, so all Pro perks read as owned.
The Debug tab only appears in dev builds (`import.meta.env.DEV` — the web analog of
`#if DEBUG`). The Debug screen also has +coins, +steps, force-rollover, a live invariant
readout, and reset.

## Coverage of the rest of the doc (Phase 0 MVP, §16)

| Doc system | Status | Where |
|---|---|---|
| Steps → live coin conversion (§4.1) | ✅ ticking live | `SimulatedStepProvider` + loop in `store.ts` |
| Adaptive daily goal (§4.2) | ✅ | `economy.adaptiveGoal` (110% of 7-day median, 4k–15k) |
| Combo + multiplier (§4.2) | ✅ | `economy.comboMultiplier` (+0.1/day, cap ×3.0) |
| Empire + capacity throttle (§6) | ✅ | `empire.ts` + `selectors.capacity` (clamp 0.10–1.25) |
| **Idle ≤ steps guarantee** | ✅ **enforced + tested** | the headline |
| Streak + Streak Freeze (§4.3) | ✅ modeled | `store.rolloverInto` (freeze protects combo) |
| Showroom / lifestyle ladder (§7) | ✅ data + UI | `showroom.ts`, `components/Showroom.tsx` (tiers, signature trophies, "next flex" tease) |
| Endowed progress (§12) | ✅ | 500 seed coins, empire not at floor on install |
| Local-first save (§15) | ✅ | `persistence.ts` (localStorage, versioned) |
| Wager + Mercy Near-Miss (§4.4) | ⛔ deferred | see push-back below |
| Prestige / Legacy (§9) | ⛔ Phase 1 | per roadmap |
| Social / Flex Card (§8) | ⛔ Phase 2 | correct per doc — validate solo loop first |

## Where I'd push back on the doc

- **Don't ship the Wager in Phase 0.** It's the highest-churn, highest-scrutiny system
  and an App Store review risk for a first submission. The core loop (steps → coins →
  empire → showroom) is fully testable without it. Add it once solo retention is proven.
- **Materialist items are pure status here, not +1% vanity multipliers** (doc §7/§18.3).
  Pure status is cleaner, braver, and keeps the invariant story airtight (cosmetics can't
  nudge earning). Easy to add the multiplier later if you want to reduce buyer's remorse.
- The doc's "Showroom must be a room, not a list" (§7) is real but it's **Phase-1 art**.
  The ladder is fully modeled now; the rendered penthouse is a visual pass, not a
  blocker for validating whether the loop is addictive.

## Run it

```bash
npm install
npm run dev     # play it in the browser (steps simulate automatically)
npm test        # run the invariant proof
```
