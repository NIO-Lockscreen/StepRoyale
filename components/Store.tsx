import { useState } from 'react';
import { gameStore, useGame, PRO_PERKS } from '../game/store';
import { IAP } from '../game/iap';
import { Button, Card } from './ui';

export function Store() {
  const s = useGame();
  const unlocked = gameStore.isProUnlocked();
  const [busy, setBusy] = useState(false);

  return (
    <div className="view">
      <Card title="Royale Pro">
        {unlocked ? (
          <div className="invariant ok">👑 Royale Pro unlocked</div>
        ) : (
          <p className="fine">One-time unlock. No subscription. The game is fully playable without it.</p>
        )}

        <div className="list">
          {PRO_PERKS.map((perk) => (
            <div key={perk} className={`row static ${unlocked ? 'owned' : ''}`}>
              <span className="row-emoji">{unlocked ? '✓' : '🔒'}</span>
              <span className="row-main"><span className="row-name">{perk}</span></span>
            </div>
          ))}
        </div>
        <p className="fine">
          None of these earn coins or rank — the leaderboard stays fair. Pro is convenience
          and flex, never power.
        </p>

        {!unlocked && (
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await IAP.purchase();
              setBusy(false);
            }}
          >
            Unlock Royale Pro · {IAP.displayPrice}
          </Button>
        )}
        <Button variant="ghost" onClick={() => IAP.restore()}>Restore Purchases</Button>
        {s.debugUnlockEverything && (
          <p className="fine">Debug “Unlock Everything” is ON — Pro reads as owned for testing.</p>
        )}
      </Card>
    </div>
  );
}
