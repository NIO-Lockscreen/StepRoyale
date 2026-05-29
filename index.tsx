import { createRoot } from 'react-dom/client';
import { App } from './App';
import { bootstrap } from './game/bootstrap';
import './index.css';

// Start the step provider + game loop (async: native shells lazy-load HealthKit).
void bootstrap();

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');
createRoot(container).render(<App />);
