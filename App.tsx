import { useState } from 'react';
import { Home } from './components/Home';
import { Empire } from './components/Empire';
import { Showroom } from './components/Showroom';
import { Store } from './components/Store';
import { Debug } from './components/Debug';
import { ToastContainer } from './components/ui';
import { useGame } from './game/store';
import { ASSET_DEFS, nextCost } from './game/empire';
import { SHOWROOM_ITEMS } from './game/showroom';

type Tab = 'home' | 'empire' | 'showroom' | 'store' | 'debug';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',     label: 'Home',     icon: '🏠' },
  { id: 'empire',   label: 'Empire',   icon: '🏢' },
  { id: 'showroom', label: 'Showroom', icon: '💎' },
  { id: 'store',    label: 'Pro',      icon: '👑' },
  { id: 'debug',    label: 'Debug',    icon: '🐞' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const s = useGame();

  // Notification dots: show when the player can afford something on that tab
  const hasAffordableEmpire = ASSET_DEFS.some(def => s.coins >= nextCost(def.id, s.assets));
  const hasAffordableShowroom = SHOWROOM_ITEMS.some(
    item => !s.ownedItemIds.includes(item.id) && s.coins >= item.cost,
  );

  function hasDot(id: Tab): boolean {
    if (id === 'empire')   return hasAffordableEmpire && tab !== 'empire';
    if (id === 'showroom') return hasAffordableShowroom && tab !== 'showroom';
    return false;
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">STRIDE</span>
        <span className="tagline">get rich. one step at a time.</span>
      </header>

      <main className="content">
        {tab === 'home'     && <Home />}
        {tab === 'empire'   && <Empire />}
        {tab === 'showroom' && <Showroom />}
        {tab === 'store'    && <Store />}
        {tab === 'debug'    && <Debug />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {hasDot(t.id) && <span className="tab-dot" />}
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <ToastContainer />
    </div>
  );
}
