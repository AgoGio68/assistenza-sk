import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Iniezione versione per controllo cache forzato (v4.6.0)
(window as any).__APP_VERSION__ = import.meta.env.VITE_APP_VERSION || '4.6.0';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
