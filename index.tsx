import { createRoot } from 'react-dom/client';
import App from './App';
import { boot } from './game/engine';
import './index.css';

boot();                       // start the step source + game loop (async; native lazy-loads HealthKit)
createRoot(document.getElementById('root')!).render(<App />);
