import { useGame } from '../game/store';
import {
  capacity, combo, dailyGoal, goalProgress, idleRatePerHour,
  invariantOk, netWorth, tier, walkRatePerHour,
} from '../game/selectors';
import { formatCoins, formatInt, formatPct } from '../game/format';
import { Bar, Card, Stat } from './ui';

export function Home() {
  const s = useGame();
  const goal = dailyGoal(s);

  return (
    <div className="view">
      <div className="hero">
        <div className="hero-coins">{formatCoins(s.coins)}</div>
        <div className="hero-sub">coins · net worth {formatCoins(netWorth(s))} · {tier(s)}</div>
      </div>

      <Card title="Today">
        <div className="goal-row">
          <span>{formatInt(s.stepsToday)} / {formatInt(goal)} steps</span>
          <span className="muted">{formatPct(goalProgress(s))}</span>
        </div>
        <Bar progress={goalProgress(s)} />
        <div className="stat-grid">
          <Stat label="Combo" value={`×${combo(s).toFixed(1)}`} accent="gold" />
          <Stat label="Streak" value={`${s.streakDays}d`} />
          <Stat label="Freezes" value={s.streakFreezes} />
          <Stat label="Empire capacity" value={formatPct(capacity(s))} accent={capacity(s) >= 1 ? 'green' : 'red'} />
        </div>
      </Card>

      {/* The invariant, made visible. Walking always wins — by construction. */}
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
