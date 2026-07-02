import { useGame } from '../game/store';
import {
  currentGoals, dailyGoal, goalHit, goalProgress,
  level, levelXp, netWorth, tier, walkRatePerHour,
} from '../game/selectors';
import { formatCoins, formatInt } from '../game/format';
import { Bar, Card, Ring } from './ui';
import { Wager } from './Wager';
import type { Tab } from '../App';

export function Home({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const s = useGame();
  const goal = dailyGoal(s);
  const hit = goalHit(s);
  const xp = levelXp(s);

  return (
    <div className="view">
      {/* Net worth hero — the concept art's headline stat. */}
      <div className="hero">
        <div className="hero-label">Net Worth</div>
        <div className="hero-worth">${formatCoins(netWorth(s))}</div>
        <div className="hero-delta">▲ {formatCoins(s.coinsToday)} today · {tier(s)}</div>
      </div>

      {/* The daily-goal ring. Turns gold with a GOAL HIT ribbon when smashed. */}
      <div className="ring-stage">
        <Ring progress={goalProgress(s)} done={hit}>
          <span className="ring-crown">👑</span>
          <span className="ring-steps">{formatInt(s.stepsToday)}</span>
          <span className="ring-goal">goal {formatInt(goal)}</span>
        </Ring>
        {hit && <div className="ribbon">✓ GOAL HIT!</div>}
      </div>

      {/* Stat tiles: coins, streak, level. */}
      <div className="tile-row">
        <div className="tile">
          <span className="tile-emoji">🪙</span>
          <span className="tile-value gold-text">{formatCoins(s.coins)}</span>
          <span className="tile-label">Royal Coins</span>
        </div>
        <div className="tile">
          <span className="tile-emoji">🔥</span>
          <span className="tile-value">{s.streakDays}d</span>
          <span className="tile-label">Streak · ❄️ {s.streakFreezes}</span>
        </div>
        <button className="tile tile-tap" onClick={() => onNavigate('empire')}>
          <span className="tile-emoji">🛡️</span>
          <span className="tile-value gold-text">{level(s)}</span>
          <span className="tile-label">Empire Level</span>
          <Bar gold progress={xp.into / xp.span} />
        </button>
      </div>

      {/* The goal engine: there is ALWAYS a next move with visible progress. */}
      <Card title="Your next moves">
        <div className="list">
          {currentGoals(s).map((g) => (
            <button key={g.id} className={`goal ${g.done ? 'done' : ''}`} onClick={() => onNavigate(g.tab)}>
              <span className="goal-emoji">{g.emoji}</span>
              <span className="goal-main">
                <span className="goal-title">{g.title}</span>
                <span className="goal-detail">{g.detail}</span>
                <Bar progress={g.progress} gold={g.done} />
              </span>
              <span className="goal-chevron">{g.done ? '✓' : '›'}</span>
            </button>
          ))}
        </div>
      </Card>

      <Wager />

      <p className="fine center">
        Walking pays {formatCoins(walkRatePerHour(s))}/hr — always more than your idle
        empire. Steps out-earn everything, by design.
      </p>
    </div>
  );
}
