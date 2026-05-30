import { useState, useEffect, useRef } from 'react';
import {
  store, useGame, bus, type BusEvent,
  ASSETS, UPGRADES, ITEMS, PERKS, TIERS, TIER_BLURB, WAGER_TIERS, WAGER_MAX,
  assetCost, upgradeCost, comboMult, capacity, goal, idlePerHour, walkPerHour,
  invariantOk, netWorth, tierOf, nextItem, earnMult, legacyMult, canRetire, fmt, pct,
} from './game/engine';

const cls = (...x: (string | false | undefined)[]) => x.filter(Boolean).join(' ');

// ── UI primitives ─────────────────────────────────────────────────────────────
const Card = ({ title, children }: { title?: any; children: any }) => (
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

// Smoothly counts the coin number up so balance changes feel earned (juice).
function useTween(value: number) {
  const [shown, setShown] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const from = ref.current, diff = value - from; ref.current = value;
    if (Math.abs(diff) < 1) { setShown(value); return; }
    const t0 = performance.now(), dur = 450;
    let raf = 0;
    const step = (t: number) => { const k = Math.min((t - t0) / dur, 1); setShown(from + diff * (1 - (1 - k) ** 3)); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

// ── Screens ───────────────────────────────────────────────────────────────────
function Home() {
  const s = useGame(), g = goal(s), prog = Math.min(s.stepsToday / g, 1);
  const coins = useTween(s.coins);
  return (
    <div className="view">
      <div className="hero">
        <div className="hero-coins">{fmt(coins)}</div>
        <div className="hero-sub">net worth {fmt(netWorth(s))} · {tierOf(s)}{s.gen > 0 && <> · Gen {s.gen} 🎖️</>}</div>
        <div className="hero-rate">+{fmt(idlePerHour(s))}/hr idle · walking pays {fmt(walkPerHour(s))}/hr</div>
      </div>
      <Card title="Today's goal">
        <div className="goal-row"><span>{Math.floor(s.stepsToday).toLocaleString()} / {g.toLocaleString()}</span><span className="muted">{pct(prog)}</span></div>
        <div className="bar"><div className="bar-fill" style={{ width: `${prog * 100}%` }} /></div>
        {prog < 1 ? <p className="fine">{(g - s.stepsToday).toLocaleString()} steps to bank the goal and grow your combo.</p>
                  : <p className="fine green">✓ Goal hit — combo secured for tomorrow.</p>}
        <div className="stat-grid">
          <Stat label="Combo" value={`×${comboMult(s.combo).toFixed(1)}`} accent="gold" />
          <Stat label="Streak" value={`${s.streak}d 🔥`} />
          <Stat label="Freezes" value={`${s.freezes} ❄️`} />
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
        <p className="fine">Total earn multiplier: <strong>×{earnMult(s).toFixed(2)}</strong> — it lifts walking and idle together, so sitting still can never become the better move.</p>
      </Card>
    </div>
  );
}

function Empire() {
  const s = useGame();
  return (
    <div className="view">
      <Card title="Empire — passive income">
        <p className="fine">Throttled by your last walk, capped below walking. Now: <strong>{fmt(idlePerHour(s))}/hr</strong>.</p>
        <div className="list">{ASSETS.map(a => {
          const c = assetCost(a, s), ok = s.coins >= c;
          return <Row key={a.id} emoji={a.emoji} name={a.name} sub={`owned ${s.assets[a.id] || 0} · ${fmt(a.out)}/hr each`} right={fmt(c)} rightMuted={!ok} disabled={!ok} onClick={() => store.buyAsset(a.id)} />;
        })}</div>
      </Card>
      <Card title="Upgrades — permanent ×multiplier">
        <p className="fine">Boosts <em>every</em> coin you earn, walking or idle. Current: <strong>×{earnMult(s).toFixed(2)}</strong>.</p>
        <div className="list">{UPGRADES.map(u => {
          const c = upgradeCost(u, s), ok = s.coins >= c, lvl = s.upgrades[u.id] || 0;
          return <Row key={u.id} emoji={u.emoji} name={u.name} sub={`lvl ${lvl} · +${u.boost}× each`} right={fmt(c)} rightMuted={!ok} disabled={!ok} onClick={() => store.buyUpgrade(u.id)} />;
        })}</div>
      </Card>
    </div>
  );
}

function WagerScreen() {
  const s = useGame(), g = goal(s);
  const [frac, setFrac] = useState(0.1);
  const stake = Math.floor(s.coins * frac);
  if (s.wager) return (
    <div className="view"><Card title="🎰 Wager placed">
      <div className="stat-grid">
        <Stat label="Staked" value={fmt(s.wager.stake)} accent="gold" />
        <Stat label="Win pays" value={fmt(s.wager.stake * s.wager.mult)} accent="green" />
      </div>
      <p className="fine">Hit <strong>{s.wager.target.toLocaleString()}</strong> steps today to win. You're at {Math.floor(s.stepsToday).toLocaleString()}. Finish within 5% and your stake is refunded — so keep walking.</p>
      <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(s.stepsToday / s.wager.target, 1) * 100}%` }} /></div>
    </Card></div>
  );
  return (
    <div className="view"><Card title="🎰 Daily Wager">
      <p className="fine">Bet on your future self. Stake coins that you'll smash a stretch goal today. Lose and you only risk the stake (max 30% of balance) — near-misses are refunded.</p>
      <label className="fine">Stake: <strong>{fmt(stake)}</strong> ({pct(frac)} of balance)</label>
      <input className="slider" type="range" min={0.01} max={WAGER_MAX} step={0.01} value={frac} onChange={e => setFrac(+e.target.value)} />
      <div className="list">{WAGER_TIERS.map((t, i) => (
        <Row key={i} emoji="🎯" name={`${t.label} goal · ×${t.mult}`} sub={`hit ${Math.round(g * (1 + t.over)).toLocaleString()} steps → win ${fmt(stake * t.mult)}`}
          right="Bet" disabled={stake <= 0} onClick={() => store.placeWager(i, frac)} />
      ))}</div>
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

function More() {
  const s = useGame(), on = store.proUnlocked();
  const wonCount = s.achieved.length;
  return (
    <div className="view">
      <Card title="🎖️ Retire (Prestige)">
        <p className="fine">Reset coins, empire & upgrades for a permanent <strong>Legacy ×{legacyMult(s).toFixed(2)}</strong> that makes every future run faster. Your flexes and streak stay forever.</p>
        {canRetire(s)
          ? <button className="btn btn-primary" onClick={() => store.retire()}>Retire now → Gen {s.gen + 1}</button>
          : <p className="fine">Reach <strong>{fmt(1_000_000)}</strong> net worth to retire. ({fmt(netWorth(s))} so far.)</p>}
      </Card>

      <Card title={`🏆 Achievements · ${wonCount}/9`}>
        <div className="chips">{['First Business','First Flex','Self-Improvement','On a Roll (×2)','House Always Wins','Week Warrior','Rolex Money','Retired Early','Ten Figures'].map((n, i) => {
          const ids = ['firstAsset','firstItem','firstUp','combo10','wagerWin','streak7','rich','retire','billionaire'];
          const got = s.achieved.includes(ids[i]);
          return <span key={n} className={cls('chip', got && 'got')}>{got ? '🏆' : '🔒'} {n}</span>;
        })}</div>
      </Card>

      <Card title="STRIDE Pro">
        {on ? <div className="invariant ok">👑 STRIDE Pro unlocked</div> : <p className="fine">One-time unlock. No subscription. Fully playable without it.</p>}
        <div className="list">{PERKS.map(p => <Row key={p} emoji={on ? '✓' : '🔒'} name={p} owned={on} />)}</div>
        <p className="fine">None of these earn coins or rank — the leaderboard stays fair. Pro is convenience and flex, never power.</p>
        {!on && <button className="btn btn-primary" onClick={() => store.buyPro()}>Unlock STRIDE Pro · $5.99</button>}
      </Card>

      <Card title="🐞 Debug / Test">
        <label className="toggle"><input type="checkbox" checked={s.debugUnlockAll} onChange={e => store.unlockAll(e.target.checked)} /><span>🔓 Unlock Everything</span></label>
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

// ── Juice layer: toasts, floating coins, offline "welcome back" ────────────────
function Effects() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const [floats, setFloats] = useState<{ id: number; amount: number }[]>([]);
  const [offline, setOffline] = useState<{ coins: number; hours: number } | null>(null);
  const lastFloat = useRef(0);

  useEffect(() => bus.on((e: BusEvent) => {
    if (e.type === 'toast') { const id = Date.now() + Math.random(); setToasts(t => [...t, { id, msg: e.msg, kind: e.kind }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600); }
    if (e.type === 'gain') { const now = Date.now(); if (now - lastFloat.current < 600) return; lastFloat.current = now; const id = now + Math.random(); setFloats(f => [...f, { id, amount: e.amount }]); setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1100); }
    if (e.type === 'offline') setOffline({ coins: e.coins, hours: e.hours });
  }), []);

  return (
    <>
      <div className="toasts">{toasts.map(t => <div key={t.id} className={cls('toast', t.kind)}>{t.msg}</div>)}</div>
      <div className="floats">{floats.map(f => <div key={f.id} className="float">+{fmt(f.amount)}</div>)}</div>
      {offline && (
        <div className="modal-wrap" onClick={() => setOffline(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-emoji">💰</div>
            <h2>Welcome back!</h2>
            <p>Your empire earned <strong className="gold">{fmt(offline.coins)}</strong> while you were away{offline.hours >= 8 && ' (capped at 8h — walk to earn more!)'}.</p>
            <button className="btn btn-primary" onClick={() => setOffline(null)}>Collect</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
const TABS = [
  ['Home', '🏠', Home], ['Empire', '🏢', Empire], ['Wager', '🎰', WagerScreen],
  ['Showroom', '💎', Showroom], ['More', '⋯', More],
] as const;

export default function App() {
  const [i, setI] = useState(0);
  const s = useGame();
  const Screen = TABS[i][2];
  return (
    <div className="app">
      <header className="topbar"><span className="brand">STRIDE</span><span className="tagline">get rich. one step at a time.</span></header>
      <main className="content"><Screen /></main>
      <nav className="tabbar">{TABS.map(([label, icon], n) => (
        <button key={label} className={cls('tab', n === i && 'active')} onClick={() => setI(n)}>
          <span className="tab-icon">{icon}</span><span className="tab-label">{label}</span>
          {label === 'Wager' && s.wager && <span className="dot" />}
        </button>
      ))}</nav>
      <Effects />
    </div>
  );
}
