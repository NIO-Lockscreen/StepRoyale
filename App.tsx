import { useState } from 'react';
import { Home } from './components/Home';
import { Empire } from './components/Empire';
import { Showroom } from './components/Showroom';
import { Store } from './components/Store';
import { Debug } from './components/Debug';

export type Tab = 'home' | 'empire' | 'showroom' | 'store' | 'debug';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'empire', label: 'Empire', icon: '🏛️' },
  { id: 'showroom', label: 'Showroom', icon: '💎' },
  { id: 'store', label: 'Royale', icon: '👑' },
  { id: 'debug', label: 'Debug', icon: '🐞' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  // Prototype: the Debug tab (with "Unlock Everything") stays available so the deployed
  // Vercel build is fully testable on the live URL. Guard or remove before public launch.
  const tabs = TABS;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand-crown">👑</span>
        <span className="brand">STEP ROYALE</span>
        <span className="tagline">walk. earn. rule.</span>
      </header>

      <main className="content">
        {tab === 'home' && <Home onNavigate={setTab} />}
        {tab === 'empire' && <Empire />}
        {tab === 'showroom' && <Showroom />}
        {tab === 'store' && <Store />}
        {tab === 'debug' && <Debug />}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
