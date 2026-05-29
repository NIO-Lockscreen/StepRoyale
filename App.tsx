import { useState } from 'react';
import { Home } from './components/Home';
import { Empire } from './components/Empire';
import { Showroom } from './components/Showroom';
import { Store } from './components/Store';
import { Debug } from './components/Debug';

type Tab = 'home' | 'empire' | 'showroom' | 'store' | 'debug';

const TABS: { id: Tab; label: string; icon: string; devOnly?: boolean }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'empire', label: 'Empire', icon: '🏢' },
  { id: 'showroom', label: 'Showroom', icon: '💎' },
  { id: 'store', label: 'Pro', icon: '👑' },
  { id: 'debug', label: 'Debug', icon: '🐞', devOnly: true },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  // import.meta.env.DEV is the web analog of #if DEBUG — Debug tab hidden in prod builds.
  const tabs = TABS.filter((t) => !t.devOnly || import.meta.env.DEV);

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">STRIDE</span>
        <span className="tagline">get rich. one step at a time.</span>
      </header>

      <main className="content">
        {tab === 'home' && <Home />}
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
