import { gameStore, useGame } from '../game/store';
import { formatCoins } from '../game/format';
import { Button } from './ui';

/**
 * Full-screen queued moments: the "while you were away" recap and the level-up
 * celebration. One at a time — recap first (context), then the level-up.
 */
export function Celebrations() {
  const s = useGame();

  if (s.awayRecap) {
    const { awayMs, coins, daysAway } = s.awayRecap;
    const awayLabel =
      daysAway >= 1
        ? `${daysAway} day${daysAway > 1 ? 's' : ''}`
        : awayMs >= 3_600_000
          ? `${Math.round(awayMs / 3_600_000)}h`
          : `${Math.max(1, Math.round(awayMs / 60_000))} min`;
    return (
      <div className="overlay">
        <div className="overlay-card">
          <div className="overlay-emoji">🏛️</div>
          <div className="overlay-title">While you were away</div>
          <p className="overlay-sub">Your empire kept working for {awayLabel} and earned</p>
          <div className="overlay-payout">+{formatCoins(coins)} 🪙</div>
          <p className="overlay-sub">
            {s.streakDays > 0
              ? `Streak intact: ${s.streakDays}d 🔥 — walk today to keep it.`
              : 'Walk today to restart your streak and refuel the empire.'}
          </p>
          <Button variant="primary" onClick={() => gameStore.dismissRecap()}>
            Let's walk
          </Button>
        </div>
      </div>
    );
  }

  if (s.pendingLevelUp) {
    const { level, bonus, unlocks } = s.pendingLevelUp;
    return (
      <div className="overlay">
        <div className="overlay-card">
          <div className="overlay-emoji">👑</div>
          <div className="overlay-title">Level {level}!</div>
          <div className="overlay-payout">+{formatCoins(bonus)} 🪙 bonus</div>
          {unlocks.length > 0 && (
            <div className="overlay-unlocks">
              {unlocks.map((u) => (
                <div key={u.name} className="overlay-unlock">
                  {u.emoji} <strong>{u.name}</strong> unlocked
                </div>
              ))}
            </div>
          )}
          <Button variant="primary" onClick={() => gameStore.dismissLevelUp()}>
            Claim
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
