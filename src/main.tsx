import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- TASK: VERSION TRACKING + FORCE RELOAD ---
const CURRENT_VERSION = '27.2.0';
console.log("%c VERSIONE ATTUALE RILEVATA: " + CURRENT_VERSION + " ", "background: #6366f1; color: #fff; font-size: 14px; font-weight: bold; padding: 4px; border-radius: 4px;");

// Iniezione versione per controllo cache
(window as any).__APP_VERSION__ = CURRENT_VERSION;

// Force reload al primo lancio se la versione è cambiata
const STORAGE_KEY = 'app_cached_version';
const cachedVersion = localStorage.getItem(STORAGE_KEY);
if (cachedVersion !== CURRENT_VERSION) {
    console.log(`[VERSION] Nuova versione rilevata (${cachedVersion} → ${CURRENT_VERSION}). Pulizia cache e ricarica...`);
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    // Forza il browser a ricaricare senza cache
    if (cachedVersion !== null) {
        // Non è il primissimo avvio: forza hard reload
        window.location.reload();
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
