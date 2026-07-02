import { useState } from 'react';
import { gameStore, useGame } from '../game/store';
import { dailyGoal } from '../game/selectors';
import { MIN_STAKE, WAGER_TIERS, stakePresets, wagerExtraSteps } from '../game/wager';
import { formatCoins, formatInt } from '../game/format';
import { Bar, Button, Card } from './ui';

/** The daily wager card (concept art: "RISK. REWARD. REPEAT."). */
export function Wager() {
  const s = useGame();
  const [tierId, setTierId] = useState(WAGER_TIERS[1].id);
  const [stakeIdx, setStakeIdx] = useState(0);
  const w = s.wager;

  if (w?.status === 'won') {
    return (
      <Card title="Daily wager">
        <div className="invariant ok">🏆 Wager won! +{formatCoins(w.payout)} paid out</div>
        <Button onClick={() => gameStore.dismissWager()}>Collect the bragging rights</Button>
      </Card>
    );
  }

  if (w?.status === 'lost') {
    return (
      <Card title="Daily wager">
        <div className="invariant bad">💸 Wager lost — {formatCoins(w.stake)} gone. Revenge tomorrow.</div>
        <Button onClick={() => gameStore.dismissWager()}>Dismiss</Button>
      </Card>
    );
  }

  if (w) {
    const span = Math.max(w.targetSteps - w.baseSteps, 1);
    const toGo = Math.max(0, w.targetSteps - s.stepsToday);
    return (
      <Card title="Daily wager · live">
        <div className="goal-row">
          <span>🎲 {formatInt(toGo)} steps to go</span>
          <span className="gold-text">wins {formatCoins(w.payout)}</span>
        </div>
        <Bar gold progress={Math.min((s.stepsToday - w.baseSteps) / span, 1)} />
        <p className="fine">
          Reach {formatInt(w.targetSteps)} steps before midnight or the stake is gone.
        </p>
      </Card>
    );
  }

  if (s.wagersPlacedToday >= gameStore.maxWagerSlots()) {
    return (
      <Card title="Daily wager">
        <p className="fine no-top">
          {s.wagersPlacedToday > 1 ? 'Both wagers settled' : 'Settled'} for today — a new one
          opens at midnight.
          {!gameStore.isProUnlocked() && ' Royale Pro adds a second daily slot.'}
        </p>
      </Card>
    );
  }

  if (s.coins < MIN_STAKE) {
    return (
      <Card title="Daily wager">
        <p className="fine no-top">Earn {MIN_STAKE} coins to unlock today's wager.</p>
      </Card>
    );
  }

  const tier = WAGER_TIERS.find((t) => t.id === tierId)!;
  const presets = stakePresets(s.coins);
  const stake = presets[Math.min(stakeIdx, presets.length - 1)];
  const extra = wagerExtraSteps(dailyGoal(s), tier);

  return (
    <Card title="Daily wager">
      <p className="fine no-top">
        Put coins on today's legs: walk <strong>{formatInt(extra)} more steps</strong> by
        midnight and win {tier.payoutMult}× your stake.
      </p>
      <div className="chips">
        {WAGER_TIERS.map((t) => (
          <button
            key={t.id}
            className={`chip ${t.id === tierId ? 'active' : ''}`}
            onClick={() => setTierId(t.id)}
          >
            {t.emoji} {t.label}
            <span className="chip-sub">×{t.payoutMult} payout</span>
          </button>
        ))}
      </div>
      <div className="chips">
        {presets.map((p, i) => (
          <button
            key={p}
            className={`chip ${p === stake ? 'active' : ''}`}
            onClick={() => setStakeIdx(i)}
          >
            {formatCoins(p)}
            <span className="chip-sub">stake</span>
          </button>
        ))}
      </div>
      <Button variant="primary" onClick={() => gameStore.placeWager(tier.id, stake)}>
        Lock in · risk {formatCoins(stake)} → win {formatCoins(Math.round(stake * tier.payoutMult))}
      </Button>
    </Card>
  );
}
