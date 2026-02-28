import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { LogIn, UserPlus, Info, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const navigate = useNavigate();
    const { settings } = useSettings();

    const appName = import.meta.env.VITE_APP_NAME || 'ASSISTENZA SK';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Errore di autenticazione');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card">
                <img src={settings.logoUrl || "/logo-sk.jpg"} alt={settings.appName || "LMS Logo"} className="auth-logo" />
                <h2 style={{ textAlign: 'center', marginBottom: '0.2rem', fontSize: '1.5rem', fontWeight: 700 }}>{settings.appName || appName}</h2>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Versione 1.5.3
                </div>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    {isLogin ? 'Accedi al sistema' : 'Registrazione'}
                </h3>

                {error && (
                    <div style={{ backgroundColor: 'var(--danger-color)', color: 'white', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1', outline: 'none' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1', outline: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem' }}
                    >
                        {isLogin ? <><LogIn size={20} /> Entra</> : <><UserPlus size={20} /> Registrati</>}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
                    </button>
                    <br />
                    <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}
                    >
                        <Info size={16} /> Guida e Versioni
                    </button>
                </div>
            </div>

            {/* Modale Guida Temporanea */}
            {showGuide && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                        <button
                            onClick={() => setShowGuide(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={24} />
                        </button>

                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Guida Modifiche ed Evoluzione</h3>

                        <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.5.2 (Permessi Granulari)</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li><strong>Ticket Delegation:</strong> Ora gli Admin possono abilitare la creazione ticket per singoli utenti specifici dal pannello gestione utenti.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.5.1 (Personalizzazione Avanzata)</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li><strong>Riassegnazione:</strong> Nuovo sistema per spostare ticket tra colleghi con obbligo di motivazione e tracciabilità.</li>
                                <li><strong>CSV Pro:</strong> Correzione codifica per Excel (caratteri accentati ora visibili).</li>
                                <li><strong>Visibilità:</strong> Opzione Admin per restringere la vista degli utenti ai soli ticket assegnati.</li>
                                <li><strong>Layout Compatto:</strong> Nuova modalità "Griglia" per gestire grandi volumi di lavoro su PC/Tablet.</li>
                                <li><strong>Permessi:</strong> Controllo inserimento nuovi ticket delegabile o ristretto agli Admin.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.5.0 (Global Settings)</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li><strong>Global Settings:</strong> Modifica Colori Globali e Logo in tempo reale (Solo SuperAdmin).</li>
                                <li><strong>Ottimizzazione:</strong> Schermo intero sfruttato senza limiti laterali, Navigazione descrittiva.</li>
                                <li><strong>Ricerca & Analitiche:</strong> Dashboard con barra di ricerca, filtri e grafici visuali.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.4.1</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li><strong>Grafica:</strong> Separazione netta dei ticket in list e check visibilità a sinistra per il mobile. Admin Dashboard più professionale e tabellare.</li>
                                <li><strong>Ordinamento:</strong> La Admin Dashboard ha ora un toggle per scegliere se vedere la timeline rigida cronologica o i chiusi in fondo.</li>
                                <li><strong>Dettatura Vocale (Voice):</strong> Ora puoi dettare vocalmente gli appunti e le note di chiusura dei ticket grazie all'icona a forma di microfono.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.4.0</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li><strong>Priorità:</strong> I ticket che prendi in carico sono sempre i primi della lista.</li>
                                <li><strong>Assegnatari:</strong> Opzione per nascondere o visualizzare l'identità di chi ha preso in carico altri ticket.</li>
                                <li><strong>Tempistiche:</strong> Admin Dashboard mostra data apertura, presa in carico, chiusura e tempo trascorso.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.3.0</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li><strong>Conferma:</strong> Richiesta conferma "Sei sicuro?" prima di prendere in carico.</li>
                                <li><strong>Rilascio:</strong> Tasto "Rilascia" per depennare un'assegnazione erronea e rimetterla visibile a tutti.</li>
                                <li><strong>Dettagli Ticket:</strong> Visibilità totale note e descrizione anche sui ticket presi in carico da se stessi.</li>
                                <li><strong>Admin:</strong> Eliminazione definitiva utenti dal database per Superadmin.</li>
                                <li><strong>Setup Nome:</strong> Possibilità di cambiare il proprio nome in tempo reale cliccando sul tetto dell'app in alto a destra.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.2.0</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li>Notifiche Push (audio e background screen) attivate.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.1.0</h4>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                <li>UI fissa (non più popup disordinati). Login stilizzato.</li>
                                <li>Possibilità modifica dati Aziende nel pannello Admin.</li>
                            </ul>

                            <h4 style={{ color: 'var(--secondary-color)' }}>v1.0.0</h4>
                            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-primary)' }}>
                                <li>Inizializzazione con Firebase, multi-ruolo, inserzione e presa in carico ticket.</li>
                            </ul>
                        </div>

                        <button onClick={() => setShowGuide(false)} className="btn btn-primary" style={{ width: '100%' }}>
                            Chiudi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
