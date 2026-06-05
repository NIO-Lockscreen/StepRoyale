import { useState } from 'react';
import { gameStore, useGame } from '../game/store';
import { SHOWROOM_ITEMS, TIER_BANDS, TIER_ORDER, nextLockedItem } from '../game/showroom';
import { formatCoins } from '../game/format';
import { Card, toast } from './ui';

export function Showroom() {
  const s = useGame();
  const tease = nextLockedItem(s.ownedItemIds, s.coins);
  const [justBought, setJustBought] = useState<string | null>(null);

  function handleBuy(id: string, name: string, emoji: string, signature?: boolean) {
    const ok = gameStore.buyItem(id);
    if (!ok) return;
    setJustBought(id);
    setTimeout(() => setJustBought(null), 500);
    if (signature) {
      toast(emoji, `${name} — signature piece!`, 'Pure flex. Screenshot this.');
    } else {
      toast(emoji, `${name} acquired!`, 'Flexing hard');
    }
  }

  return (
    <div className="view">
      {tease && (
        <div className="tease">
          <span className="tease-emoji">{tease.emoji}</span>
          <span>
            Next flex: <strong>{tease.name}</strong>
            <span className="muted"> · {formatCoins(tease.cost)}</span>
          </span>
        </div>
      )}

      {TIER_ORDER.map((t) => {
        const items = SHOWROOM_ITEMS.filter((i) => i.tier === t);
        return (
          <Card key={t} title={`${t} — ${TIER_BANDS[t].blurb}`}>
            <div className="list">
              {items.map((item) => {
                const owned = s.ownedItemIds.includes(item.id);
                const affordable = s.coins >= item.cost;
                const isBought = justBought === item.id;
                const classes = [
                  'row',
                  owned ? 'owned' : '',
                  isBought ? 'just-bought' : '',
                  !owned && affordable ? 'can-afford' : '',
                ].filter(Boolean).join(' ');

                return (
                  <button
                    key={item.id}
                    className={classes}
                    disabled={owned || !affordable}
                    onClick={() => handleBuy(item.id, item.name, item.emoji, item.signature)}
                  >
                    <span className="row-emoji">{item.emoji}</span>
                    <span className="row-main">
                      <span className="row-name">
                        {item.name} {item.signature && <span className="badge">signature</span>}
                      </span>
                      <span className="row-sub">{owned ? 'owned — pure flex' : 'status item'}</span>
                    </span>
                    <span className={`row-cost ${affordable || owned ? '' : 'muted'}`}>
                      {owned ? '✓' : formatCoins(item.cost)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
