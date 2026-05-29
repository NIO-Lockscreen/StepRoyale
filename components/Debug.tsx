import { gameStore, useGame } from '../game/store';
import { idleRatePerHour, walkRatePerHour, invariantOk } from '../game/selectors';
import { formatCoins } from '../game/format';
import { Button, Card, Stat } from './ui';

/** Test tools. The headline is "Unlock Everything" — flip it to open every gate without
 *  paying, exactly as you asked. */
export function Debug() {
  const s = useGame();

  return (
    <div className="view">
      <Card title="Test unlocks">
        <label className="toggle">
          <input
            type="checkbox"
            checked={s.debugUnlockEverything}
            onChange={(e) => gameStore.setDebugUnlockEverything(e.target.checked)}
          />
          <span>🔓 Unlock Everything</span>
        </label>
        <p className="fine">Opens every Pro perk and gated feature — no purchase needed.</p>
      </Card>

      <Card title="Money & progress">
        <div className="btn-row">
          <Button onClick={() => gameStore.addCoins(100_000)}>+100K coins</Button>
          <Button onClick={() => gameStore.addCoins(1_000_000_000)}>+1B coins</Button>
          <Button onClick={() => gameStore.addStreakFreeze()}>+ Streak Freeze</Button>
          <Button onClick={() => gameStore.forceRollover()}>Force day rollover</Button>
        </div>
      </Card>

      <Card title="Simulate steps">
        <div className="btn-row">
          <Button onClick={() => gameStore.addSteps(1_000)}>+1,000 steps</Button>
          <Button onClick={() => gameStore.addSteps(8_000)}>+8,000 steps</Button>
        </div>
      </Card>

      <Card title="Invariant (live)">
        <div className="stat-grid">
          <Stat label="Walk / hr" value={formatCoins(walkRatePerHour(s))} accent="green" />
          <Stat label="Idle / hr" value={formatCoins(idleRatePerHour(s))} />
        </div>
        <div className={`invariant ${invariantOk(s) ? 'ok' : 'bad'}`}>
          {invariantOk(s) ? '✓ holds' : '✗ broken'}
        </div>
      </Card>

      <Card title="Danger">
        <Button variant="ghost" onClick={() => gameStore.resetAll()}>Reset all progress</Button>
      </Card>
    </div>
  );
}
