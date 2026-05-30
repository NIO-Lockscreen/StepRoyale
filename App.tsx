import { useState } from 'react';
import {
  store, useGame, ASSETS, ITEMS, PERKS, TIERS, TIER_BLURB,
  assetCost, comboMult, capacity, goal, idlePerHour, walkPerHour,
  invariantOk, netWorth, tierOf, nextItem, fmt, pct,
} from './game/engine';

const cls = (...x: (string | false | undefined)[]) => x.filter(Boolean).join(' ');

// ── UI primitives ─────────────────────────────────────────────────────────────
const Card = ({ title, children }: { title?: string; children: any }) => (
  <section className="card">{title && <h2 className="card-title">{title}</h2>}{children}</section>
);
const Stat = ({ label, value, accent }: { label: string; value: any; accent?: string }) => (
  <div className="stat"><span className="stat-label">{label}</span><span className={cls('stat-value', accent)}>{value}</span></div>
);
const Row = ({ emoji, name, sub, right, rightMuted, owned, disabled, onClick }: any) => (
  <button className={cls('row', owned && 'owned', !onClick && 'static')} disabled={disabled} onClick={onClick}>
    <span className="row-emoji">{emoji}</span>
    <span className="row-main"><span className="row-name">{name}</span>{sub && <span className="row-sub">{sub}</span>}</span>
    {right != null && <span className={cls('row-cost', rightMuted && 'muted')}>{right}</span>}
  </button>
);

// ── Screens ───────────────────────────────────────────────────────────────────
function Home() {
  const s = useGame(), g = goal(s), prog = Math.min(s.stepsToday / g, 1);
  return (
    <div className="view">
      <div className="hero">
        <div className="hero-coins">{fmt(s.coins)}</div>
        <div className="hero-sub">coins · net worth {fmt(netWorth(s))} · {tierOf(s)}</div>
      </div>
      <Card title="Today">
        <div className="goal-row"><span>{Math.floor(s.stepsToday).toLocaleString()} / {g.toLocaleString()} steps</span><span className="muted">{pct(prog)}</span></div>
        <div className="bar"><div className="bar-fill" style={{ width: `${prog * 100}%` }} /></div>
        <div className="stat-grid">
          <Stat label="Combo" value={`×${comboMult(s.combo).toFixed(1)}`} accent="gold" />
          <Stat label="Streak" value={`${s.streak}d`} />
          <Stat label="Freezes" value={s.freezes} />
          <Stat label="Capacity" value={pct(capacity(s))} accent={capacity(s) >= 1 ? 'green' : 'red'} />
        </div>
      </Card>
      {/* The invariant, made visible. Walking always wins — by construction. */}
      <Card title="Why walking wins">
        <div className="stat-grid">
          <Stat label="Walk / hr" value={fmt(walkPerHour(s))} accent="green" />
          <Stat label="Idle / hr" value={fmt(idlePerHour(s))} />
        </div>
        <div className={cls('invariant', invariantOk(s) ? 'ok' : 'bad')}>{invariantOk(s) ? '✓ Steps out-earn idle. Always.' : '✗ INVARIANT BROKEN'}</div>
        <p className="fine">Idle is hard-clamped below what you'd earn walking that same hour. No empire, upgrade, or event can make sitting still the better move.</p>
      </Card>
    </div>
  );
}

function Empire() {
  const s = useGame();
  return (
    <div className="view"><Card title="Empire">
      <p className="fine">Passive coins/hr — throttled by your last walk and capped below walking. Now: <strong>{fmt(idlePerHour(s))}/hr</strong>.</p>
      <div className="list">{ASSETS.map(a => {
        const c = assetCost(a, s), ok = s.coins >= c;
        return <Row key={a.id} emoji={a.emoji} name={a.name} sub={`owned ${s.assets[a.id] || 0} · ${fmt(a.out)}/hr each`} right={fmt(c)} rightMuted={!ok} disabled={!ok} onClick={() => store.buyAsset(a.id)} />;
      })}</div>
    </Card></div>
  );
}

function Showroom() {
  const s = useGame(), tease = nextItem(s);
  return (
    <div className="view">
      {tease && <div className="tease"><span className="tease-emoji">{tease.emoji}</span><span>Next flex: <strong>{tease.name}</strong><span className="muted"> · {fmt(tease.cost)}</span></span></div>}
      {TIERS.map(t => (
        <Card key={t} title={`${t} — ${TIER_BLURB[t]}`}>
          <div className="list">{ITEMS.filter(i => i.tier === t).map(i => {
            const owned = s.items.includes(i.id), ok = s.coins >= i.cost;
            return <Row key={i.id} emoji={i.emoji} owned={owned} disabled={owned || !ok} onClick={owned ? undefined : () => store.buyItem(i.id)}
              name={<>{i.name} {i.sig && <span className="badge">signature</span>}</>} sub={owned ? 'owned — pure flex' : 'status item'}
              right={owned ? '✓' : fmt(i.cost)} rightMuted={!ok && !owned} />;
          })}</div>
        </Card>
      ))}
    </div>
  );
}

function Pro() {
  const s = useGame(), on = store.proUnlocked();
  return (
    <div className="view"><Card title="STRIDE Pro">
      {on ? <div className="invariant ok">👑 STRIDE Pro unlocked</div> : <p className="fine">One-time unlock. No subscription. Fully playable without it.</p>}
      <div className="list">{PERKS.map(p => <Row key={p} emoji={on ? '✓' : '🔒'} name={p} owned={on} />)}</div>
      <p className="fine">None of these earn coins or rank — the leaderboard stays fair. Pro is convenience and flex, never power.</p>
      {!on && <button className="btn btn-primary" onClick={() => store.buyPro()}>Unlock STRIDE Pro · $5.99</button>}
      {s.debugUnlockAll && <p className="fine">Debug "Unlock Everything" is ON — Pro reads as owned.</p>}
    </Card></div>
  );
}

function Debug() {
  const s = useGame();
  return (
    <div className="view">
      <Card title="Test unlocks">
        <label className="toggle"><input type="checkbox" checked={s.debugUnlockAll} onChange={e => store.unlockAll(e.target.checked)} /><span>🔓 Unlock Everything</span></label>
        <p className="fine">Opens every Pro perk and gated feature — no purchase needed.</p>
      </Card>
      <Card title="Cheats">
        <div className="btn-row">
          <button className="btn" onClick={() => store.give(1e5)}>+100K</button>
          <button className="btn" onClick={() => store.give(1e9)}>+1B</button>
          <button className="btn" onClick={() => store.steps(8000)}>+8K steps</button>
          <button className="btn" onClick={() => store.freeze()}>+ Freeze</button>
          <button className="btn" onClick={() => store.rollNow()}>Next day</button>
          <button className="btn btn-ghost" onClick={() => store.reset()}>Reset</button>
        </div>
      </Card>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
const TABS = [
  ['Home', '🏠', Home], ['Empire', '🏢', Empire], ['Showroom', '💎', Showroom],
  ['Pro', '👑', Pro], ['Debug', '🐞', Debug],
] as const;

export default function App() {
  const [i, setI] = useState(0);
  const Screen = TABS[i][2];
  return (
    <div className="app">
      <header className="topbar"><span className="brand">STRIDE</span><span className="tagline">get rich. one step at a time.</span></header>
      <main className="content"><Screen /></main>
      <nav className="tabbar">{TABS.map(([label, icon], n) => (
        <button key={label} className={cls('tab', n === i && 'active')} onClick={() => setI(n)}><span className="tab-icon">{icon}</span><span className="tab-label">{label}</span></button>
      ))}</nav>
    </div>
  );
}
