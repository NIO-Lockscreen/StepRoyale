import { gameStore, useGame } from '../game/store';
import { ASSET_DEFS, nextCost, ownedCount } from '../game/empire';
import { idleRatePerHour } from '../game/selectors';
import { formatCoins } from '../game/format';
import { Card } from './ui';

export function Empire() {
  const s = useGame();

  return (
    <div className="view">
      <Card title="Empire">
        <p className="fine">
          Passive coins/hr — but throttled by your last walk and capped below walking.
          Earning now: <strong>{formatCoins(idleRatePerHour(s))}/hr</strong>.
        </p>
        <div className="list">
          {ASSET_DEFS.map((def) => {
            const count = ownedCount(s.assets, def.id);
            const cost = nextCost(def.id, s.assets);
            const affordable = s.coins >= cost;
            return (
              <button
                key={def.id}
                className="row"
                disabled={!affordable}
                onClick={() => gameStore.buyAsset(def.id)}
              >
                <span className="row-emoji">{def.emoji}</span>
                <span className="row-main">
                  <span className="row-name">{def.name}</span>
                  <span className="row-sub">
                    owned {count} · {formatCoins(def.baseOutputPerHour)}/hr each
                  </span>
                </span>
                <span className={`row-cost ${affordable ? '' : 'muted'}`}>{formatCoins(cost)}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
