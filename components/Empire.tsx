import { gameStore, useGame } from '../game/store';
import { ASSET_DEFS, nextCost, ownedCount } from '../game/empire';
import { ASSET_UNLOCK_LEVEL, nextUnlock } from '../game/progression';
import { idleRatePerHour, level, levelXp } from '../game/selectors';
import { formatCoins, formatInt } from '../game/format';
import { Bar, Card } from './ui';

export function Empire() {
  const s = useGame();
  const lvl = level(s);
  const xp = levelXp(s);
  const upcoming = nextUnlock(lvl);

  return (
    <div className="view">
      {/* The ladder header: level shield + XP toward the next unlock. */}
      <div className="level-card">
        <div className="level-shield">
          <span className="level-crown">👑</span>
          <span className="level-num">{lvl}</span>
          <span className="level-tag">Empire Level</span>
        </div>
        <div className="level-progress">
          <div className="level-xp">{formatInt(xp.into)} / {formatInt(xp.span)} steps</div>
          <Bar gold progress={xp.into / xp.span} />
          {upcoming && (
            <div className="level-next">
              Next: {upcoming.emoji} <strong>{upcoming.name}</strong> at Lv {upcoming.atLevel}
            </div>
          )}
        </div>
      </div>

      <Card title={`Your empire · ${formatCoins(idleRatePerHour(s))}/hr passive`}>
        <p className="fine">
          Passive income runs off yesterday's walk — and is always capped below what
          walking earns. Keep stepping to keep the empire humming.
        </p>
        <div className="list">
          {ASSET_DEFS.map((def) => {
            const unlockAt = ASSET_UNLOCK_LEVEL[def.id] ?? 1;
            const locked = lvl < unlockAt;
            const count = ownedCount(s.assets, def.id);
            const cost = nextCost(def.id, s.assets);
            const affordable = s.coins >= cost;
            return (
              <button
                key={def.id}
                className={`row ${locked ? 'locked' : ''}`}
                disabled={locked || !affordable}
                onClick={() => gameStore.buyAsset(def.id)}
              >
                <span className="row-emoji">{locked ? '🔒' : def.emoji}</span>
                <span className="row-main">
                  <span className="row-name">{def.name}</span>
                  <span className="row-sub">
                    {locked
                      ? `Unlocks at Level ${unlockAt} — keep walking`
                      : `owned ${count} · ${formatCoins(def.baseOutputPerHour)}/hr each`}
                  </span>
                </span>
                <span className={`row-cost ${affordable && !locked ? '' : 'muted'}`}>
                  {locked ? `Lv ${unlockAt}` : formatCoins(cost)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
