import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- TASK: VERSION TRACKING ---
console.log("%c VERSIONE ATTUALE RILEVATA: 20.0.0 ", "background: #6366f1; color: #fff; font-size: 14px; font-weight: bold; padding: 4px; border-radius: 4px;");

// Iniezione versione per controllo cache
(window as any).__APP_VERSION__ = '20.0.0';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
