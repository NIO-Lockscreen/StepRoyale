import { useState } from 'react';
import { gameStore, useGame } from '../game/store';
import { ASSET_DEFS, nextCost, ownedCount } from '../game/empire';
import { idleRatePerHour } from '../game/selectors';
import { formatCoins } from '../game/format';
import { Card, toast } from './ui';

export function Empire() {
  const s = useGame();
  const [justBought, setJustBought] = useState<string | null>(null);

  function handleBuy(defId: string, defName: string) {
    const ok = gameStore.buyAsset(defId);
    if (!ok) return;
    setJustBought(defId);
    setTimeout(() => setJustBought(null), 500);
    const count = ownedCount(s.assets, defId);
    if (count === 0) {
      toast('🏆', `${defName} unlocked!`, 'Empire expanded');
    } else {
      toast('💼', `${defName} #${count + 1}`, `+${formatCoins(ASSET_DEFS.find(d => d.id === defId)!.baseOutputPerHour)}/hr`);
    }
  }

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
            const isBought = justBought === def.id;
            const classes = [
              'row',
              isBought ? 'just-bought' : '',
              affordable && !isBought ? 'can-afford' : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={def.id}
                className={classes}
                disabled={!affordable}
                onClick={() => handleBuy(def.id, def.name)}
              >
                <span className="row-emoji">{def.emoji}</span>
                <span className="row-main">
                  <span className="row-name">
                    {def.name}
                    {count > 0 && <span className="badge">×{count}</span>}
                  </span>
                  <span className="row-sub">
                    {formatCoins(def.baseOutputPerHour)}/hr each
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
