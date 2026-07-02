import { gameStore, useGame } from '../game/store';
import { SHOWROOM_ITEMS, TIER_BANDS, TIER_ORDER } from '../game/showroom';
import { TIER_UNLOCK_LEVEL, tierUnlocked } from '../game/progression';
import { level } from '../game/selectors';
import { formatCoins } from '../game/format';
import { Card } from './ui';

export function Showroom() {
  const s = useGame();
  const lvl = level(s);

  // The tease: cheapest unowned item in an unlocked tier — your next flex.
  const tease = SHOWROOM_ITEMS
    .filter((i) => !s.ownedItemIds.includes(i.id) && tierUnlocked(i.tier, lvl))
    .sort((a, b) => a.cost - b.cost)[0];

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
        const tierOpen = tierUnlocked(t, lvl);
        const title = tierOpen
          ? `${t} — ${TIER_BANDS[t].blurb}`
          : `🔒 ${t} — unlocks at Level ${TIER_UNLOCK_LEVEL[t]}`;
        return (
          <Card key={t} title={title}>
            <div className={`list ${tierOpen ? '' : 'list-locked'}`}>
              {items.map((item) => {
                const owned = s.ownedItemIds.includes(item.id);
                const affordable = s.coins >= item.cost;
                return (
                  <button
                    key={item.id}
                    className={`row ${owned ? 'owned' : ''} ${tierOpen ? '' : 'locked'}`}
                    disabled={!tierOpen || owned || !affordable}
                    onClick={() => gameStore.buyItem(item.id)}
                  >
                    <span className="row-emoji">{item.emoji}</span>
                    <span className="row-main">
                      <span className="row-name">
                        {item.name} {item.signature && <span className="badge">signature</span>}
                      </span>
                      <span className="row-sub">
                        {owned ? 'owned — pure flex' : tierOpen ? 'status item' : 'keep stepping to unlock'}
                      </span>
                    </span>
                    <span className={`row-cost ${(affordable || owned) && tierOpen ? '' : 'muted'}`}>
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
