import { useState } from 'react';
import { gameStore, useGame, PRO_PERKS } from '../game/store';
import { IAP } from '../game/iap';
import { FLEX_FRAMES, FREEZES_PER_MONTH, THEMES, flexFrame } from '../game/pro';
import { level, netWorth, tier } from '../game/selectors';
import { formatCoins, formatInt } from '../game/format';
import { Button, Card } from './ui';

/** The Royale tab. Locked: the purchase pitch. Unlocked: every perk, LIVE. */
export function Store() {
  const s = useGame();
  const unlocked = gameStore.isProUnlocked();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!unlocked) {
    return (
      <div className="view">
        <Card title="Royale Pro">
          <p className="fine no-top">
            One-time unlock. No subscription. The game is fully playable without it.
          </p>
          <div className="list">
            {PRO_PERKS.map((perk) => (
              <div key={perk} className="row static">
                <span className="row-emoji">🔒</span>
                <span className="row-main"><span className="row-name">{perk}</span></span>
              </div>
            ))}
          </div>
          <p className="fine">
            None of these earn coins or rank — the leaderboard stays fair. Pro is convenience
            and flex, never power.
          </p>
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
          <Button variant="ghost" onClick={() => IAP.restore()}>Restore Purchases</Button>
        </Card>
      </div>
    );
  }

  const frame = flexFrame(s.flexFrame);
  const stashLeft = gameStore.freezeStashRemaining();

  const copyFlex = async () => {
    const text =
      `👑 STEP ROYALE — Net worth $${formatCoins(netWorth(s))} · ` +
      `Level ${level(s)} ${tier(s)} · ${s.streakDays}d streak 🔥 Walk. Earn. Rule.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — button just stays put */
    }
  };

  return (
    <div className="view">
      <div className="invariant ok">👑 Royale Pro active</div>

      <Card title="Flex card">
        <div className={`flex-card frame-${frame.id}`}>
          <div className="flex-head">
            <span>👑 Step Royale</span>
            <span>{frame.name}</span>
          </div>
          <div className="flex-worth">${formatCoins(netWorth(s))}</div>
          <div className="flex-tier">{tier(s)}</div>
          <div className="flex-stats">
            <span>🛡️ Lv {level(s)}</span>
            <span>🔥 {s.streakDays}d</span>
            <span>👟 {formatInt(s.stepsToday)} today</span>
          </div>
        </div>
        <div className="chips">
          {FLEX_FRAMES.map((f) => (
            <button
              key={f.id}
              className={`chip ${f.id === frame.id ? 'active' : ''}`}
              onClick={() => gameStore.setFlexFrame(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <Button onClick={copyFlex}>{copied ? '✓ Copied!' : 'Copy flex to clipboard'}</Button>
      </Card>

      <Card title="App theme">
        <div className="chips">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`chip ${t.id === s.proTheme ? 'active' : ''}`}
              onClick={() => gameStore.setProTheme(t.id)}
            >
              <span className="swatch" style={{ background: t.accent }} />
              {t.name}
            </button>
          ))}
        </div>
        <p className="fine">Re-skins the accent across the whole app — ring, bars, everything.</p>
      </Card>

      <Card title="Streak freeze stash">
        <p className="fine no-top">
          You hold ❄️ {s.streakFreezes}. The stash refills every month.
        </p>
        <Button
          variant="primary"
          disabled={stashLeft <= 0}
          onClick={() => gameStore.claimStreakFreeze()}
        >
          {stashLeft > 0
            ? `Claim a freeze · ${stashLeft} of ${FREEZES_PER_MONTH} left this month`
            : 'Stash empty — refills next month'}
        </Button>
      </Card>

      <Card title="Wager slots">
        <p className="fine no-top">
          Two daily wagers instead of one. Used today: {Math.min(s.wagersPlacedToday, 2)}/2.
        </p>
      </Card>

      <Card title="Second club slot">
        <p className="fine no-top">
          Clubs arrive with the social update — your extra slot is already reserved. 🤝
        </p>
      </Card>

      <p className="fine center">
        Pro is convenience and flex, never earning power — the leaderboard stays fair.
      </p>
      {s.debugUnlockEverything && (
        <p className="fine center">Debug “Unlock Everything” is ON — Pro reads as owned for testing.</p>
      )}
    </div>
  );
}
