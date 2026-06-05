import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import {
  capacity, combo, dailyGoal, goalProgress, idleRatePerHour,
  invariantOk, netWorth, tier, walkRatePerHour,
} from '../game/selectors';
import { formatCoins, formatInt, formatPct } from '../game/format';
import { Bar, Card, Stat, toast, useFlashOnIncrease } from './ui';

function streakFire(days: number): string {
  if (days >= 30) return '🔥🔥🔥';
  if (days >= 7)  return '🔥🔥';
  if (days >= 3)  return '🔥';
  return '';
}

export function Home() {
  const s = useGame();
  const goal = dailyGoal(s);
  const progress = goalProgress(s);
  const goalDone = progress >= 1;
  const currentTier = tier(s);

  // Coin glow when steps are ingested
  const coinRef = useFlashOnIncrease(s.coins, 5, 1800);

  // Toast when daily goal is first completed
  const goalToastedRef = useRef(false);
  useEffect(() => {
    if (goalDone && !goalToastedRef.current) {
      goalToastedRef.current = true;
      toast('🎯', 'Daily goal crushed!', `${formatInt(goal)} steps — combo ×${combo(s).toFixed(1)}`);
    }
    if (!goalDone) goalToastedRef.current = false;
  }, [goalDone, goal, s]);

  // Toast when tier changes (upward only)
  const prevTierRef = useRef(currentTier);
  useEffect(() => {
    const tiers = ['Broke', 'Comfortable', 'Wealthy', 'Rich', 'Ultra', 'Billionaire'];
    if (
      prevTierRef.current !== currentTier &&
      tiers.indexOf(currentTier) > tiers.indexOf(prevTierRef.current)
    ) {
      toast('💰', `You're now: ${currentTier}!`, 'Net worth milestone reached');
    }
    prevTierRef.current = currentTier;
  }, [currentTier]);

  // Toast on streak milestones
  const prevStreakRef = useRef(s.streakDays);
  useEffect(() => {
    const prev = prevStreakRef.current;
    const cur = s.streakDays;
    if (cur > prev) {
      if (cur === 7)  toast('🔥🔥', '7-day streak!', 'You\'re on fire!');
      else if (cur === 30) toast('🔥🔥🔥', '30-day streak!', 'Unstoppable!');
      else if (cur === 3)  toast('🔥', '3-day streak!', 'Keep it going!');
    }
    prevStreakRef.current = cur;
  }, [s.streakDays]);

  return (
    <div className="view">
      <div className="hero">
        <div className="hero-coins" ref={coinRef}>{formatCoins(s.coins)}</div>
        <div className="hero-sub">coins · net worth {formatCoins(netWorth(s))} · {currentTier}</div>
      </div>

      <Card title="Today">
        <div className="goal-row">
          <span>{formatInt(s.stepsToday)} / {formatInt(goal)} steps</span>
          <span className="muted">{formatPct(progress)}</span>
        </div>
        <Bar progress={progress} complete={goalDone} />
        {goalDone && (
          <div className="goal-complete">✓ Goal complete — you're earning at full combo!</div>
        )}
        <div className="stat-grid">
          <Stat
            label="Combo"
            value={`×${combo(s).toFixed(1)}`}
            accent="gold"
          />
          <Stat
            label="Streak"
            value={
              <span>
                {s.streakDays}d{' '}
                {s.streakDays >= 3 && (
                  <span className="streak-fire">{streakFire(s.streakDays)}</span>
                )}
              </span>
            }
            accent={s.streakDays >= 7 ? 'gold' : undefined}
          />
          <Stat label="Freezes" value={s.streakFreezes} />
          <Stat
            label="Empire cap"
            value={formatPct(capacity(s))}
            accent={capacity(s) >= 1 ? 'green' : 'red'}
          />
        </div>
      </Card>

      <Card title="Why walking wins">
        <div className="stat-grid">
          <Stat label="Walk / hr" value={formatCoins(walkRatePerHour(s))} accent="green" />
          <Stat label="Idle / hr" value={formatCoins(idleRatePerHour(s))} />
        </div>
        <div className={`invariant ${invariantOk(s) ? 'ok' : 'bad'}`}>
          {invariantOk(s)
            ? '✓ Steps out-earn idle. Always.'
            : '✗ INVARIANT BROKEN'}
        </div>
        <p className="fine">
          Idle income is hard-clamped below what you'd earn walking that same hour. No
          empire, upgrade, or event can ever make sitting still the better move.
        </p>
      </Card>
    </div>
  );
}
