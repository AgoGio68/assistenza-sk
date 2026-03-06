import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { LogIn, UserPlus, Info, X, Mail, ArrowLeft } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const navigate = useNavigate();
    const { settings } = useSettings();

    const appName = import.meta.env.VITE_APP_NAME || 'ASSISTENZA SK';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (isForgotPassword) {
                await sendPasswordResetEmail(auth, email);
                setMessage('Email di recupero inviata! Controlla la tua casella di posta (anche nello spam).');
                setTimeout(() => setIsForgotPassword(false), 5000);
            } else if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/');
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            let errorMessage = err.message || 'Errore di autenticazione';
            if (err.code === 'auth/user-not-found') errorMessage = 'Nessun utente trovato con questa email.';
            if (err.code === 'auth/wrong-password') errorMessage = 'Password errata.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card">
                <img src={settings.logoUrl || "/logo-sk.jpg"} alt={settings.appName || "LMS Logo"} className="auth-logo" />
                <h2 style={{
                    textAlign: 'center', marginBottom: '0.2rem',
                    fontSize: '1.6rem', fontWeight: 800,
                    background: 'linear-gradient(135deg, #f1f5f9 30%, #94a3b8)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                }}>{settings.appName || appName}</h2>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem', color: 'var(--text-muted)', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
                    v{__APP_VERSION__}
                </div>

                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '1rem' }}>
                    {isForgotPassword ? 'Recupero Password' : (isLogin ? 'Accedi al sistema' : 'Registrazione')}
                </h3>

                {error && (
                    <div style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    {!isForgotPassword && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <label htmlFor="password" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-teal)', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                        Dimenticata?
                                    </button>
                                )}
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: '0.75rem', padding: '0.9rem', fontSize: '1rem' }}
                    >
                        {isForgotPassword ? (
                            <><Mail size={20} /> Invia link di reset</>
                        ) : (
                            isLogin ? <><LogIn size={20} /> Entra</> : <><UserPlus size={20} /> Registrati</>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    {isForgotPassword ? (
                        <button
                            onClick={() => setIsForgotPassword(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-teal)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}
                        >
                            <ArrowLeft size={16} /> Torna al login
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
                        </button>
                    )}
                    <br />
                    <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                    >
                        <Info size={14} /> Novità & Changelog
                    </button>
                </div>
            </div>

            {/* Modale Changelog Premium */}
            {showGuide && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
                        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: '20px',
                        padding: '2rem 2rem 2.5rem',
                        position: 'relative',
                        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.08)',
                    }}>
                        <button
                            onClick={() => setShowGuide(false)}
                            style={{
                                position: 'absolute', top: '1.25rem', right: '1.25rem',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '50%', width: '36px', height: '36px',
                                cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px #6366f1' }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6366f1' }}>Assistenza SK</span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Novit\u00e0 &amp; Aggiornamenti</h2>
                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
                                Cronologia versioni &middot; versione attuale: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>v{__APP_VERSION__}</strong>
                            </p>
                        </div>

                        {([
                            { version: '2.2.15', label: 'UX', color: '#f59e0b', items: ['Changelog accessibile direttamente dal pulsante sotto il form.', 'Rimosso selettore pillola Manuale/Changelog: dedicato ora solo alla cronologia.'] },
                            { version: '2.2.14', label: 'UI POLISH', color: '#8b5cf6', items: ['Selettore Manuale/Changelog rimpiazzato con pillola Glassmorphism e transizioni fluide.'] },
                            { version: '2.2.13', label: 'DOC', color: '#0ea5e9', items: ['Manuale utente riscritto: ordinamento installazioni, Google Calendar, moduli SuperAdmin.'] },
                            { version: '2.2.12', label: 'FIX', color: '#10b981', items: ['Griglia allineata per "Moduli da attivare": colonne proporzionali, ordine visivo garantito.'] },
                            { version: '2.2.11', label: 'LAYOUT', color: '#f59e0b', items: ['Checklist moduli flex-wrap compatto.', 'Impostazioni Admin: layout a griglia, larghezza piena.'] },
                            { version: '2.2.10', label: 'FEATURE', color: '#6366f1', items: ['Sede di installazione (Cliente \u2014 Citt\u00e0) nella card e nel titolo evento Google Calendar.'] },
                            { version: '2.2.9', label: 'SUPERADMIN', color: '#ec4899', items: ['Lista Moduli Attivabili configurabile dal pannello Impostazioni senza toccare codice.'] },
                            { version: '2.2.8', label: 'FEATURE', color: '#6366f1', items: ['Ordinamento intelligente: installazioni con data evidenziate e in prima posizione.', 'Nuova checklist interattiva Moduli nel Dettaglio Installazione.'] },
                            { version: '2.2.7', label: 'FIX', color: '#10b981', items: ['Parser CSV riscritto per note multiriga nelle celle Google Sheets.'] },
                            { version: '2.2.6', label: 'FIX', color: '#10b981', items: ['Componenti Estratti riconosciuti anche con celle vuote nel foglio.'] },
                            { version: '2.2.5', label: 'LAYOUT', color: '#f59e0b', items: ['Sezione "Applicazioni" rimossa: pi\u00f9 spazio ai Componenti Estratti automatici.'] },
                            { version: '2.2.4', label: 'FIX', color: '#10b981', items: ['Fix GID Google Sheet per sincronizzazione precisa componenti.'] },
                            { version: '2.2.3', label: 'FEATURE', color: '#6366f1', items: ['Componenti macchina estratti dai commenti Google Sheet.', 'Script onEdit per aggiornamento real-time.'] },
                            { version: '2.2.2', label: 'FEATURE', color: '#6366f1', items: ['Google Calendar: evento collaudo con un click.', 'Luce arancione pulsante su schede in attesa verifica.'] },
                            { version: '2.1.0', label: 'FEATURE', color: '#6366f1', items: ['Assegnazione ticket al collega in fase creazione.', 'Pannello permessi granulari per Admin e Utenti.'] },
                            { version: '2.0.8', label: 'FIX', color: '#10b981', items: ['Corretto errore credential-already-in-use nella riconnessione Google Calendar.'] },
                            { version: '2.0.7', label: 'FIX', color: '#10b981', items: ['Google Calendar esteso a tutti gli Admin.', 'Popup se collaudo senza account Google collegato.'] },
                            { version: '2.0.6', label: 'FIX', color: '#10b981', items: ['"Sposta" sincronizza automaticamente su Google Calendar.', 'Avviso token scaduto, chiusura modal corretta.'] },
                            { version: '2.0.5', label: 'UX', color: '#f59e0b', items: ['Auto-completamento aziende. Svuotamento form. Orario default 08:00 eventi.'] },
                            { version: '2.0.0', label: 'BIG RELEASE', color: '#ef4444', items: ['Fatturazione automatica da colonna Consegna.', 'Installazioni fatturate a fondo lista. Firebase migrato.'] },
                            { version: '1.9.x', label: 'MILESTONE', color: '#64748b', items: ['Installazioni con Google Sheets, dettagli, stati, fix duplicati, cache-busting, mobile ready.'] },
                        ] as { version: string; label: string; color: string; items: string[] }[]).map(({ version, label, color, items }) => (
                            <div key={version} style={{
                                marginBottom: '0.75rem',
                                background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderLeft: `3px solid ${color}`,
                                borderRadius: '12px',
                                padding: '0.9rem 1.1rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.5rem' }}>
                                    <span style={{
                                        background: `${color}20`,
                                        color: color,
                                        fontSize: '0.6rem', fontWeight: 800,
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                        padding: '0.15rem 0.5rem', borderRadius: '5px',
                                        border: `1px solid ${color}33`,
                                    }}>{label}</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#cbd5e1' }}>v{version}</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.65 }}>
                                    {items.map((item, i) => <li key={i} style={{ marginBottom: '0.15rem' }}>{item}</li>)}
                                </ul>
                            </div>
                        ))}

                        <div style={{ marginTop: '1.25rem', textAlign: 'center', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <a
                                href={`/manuale.html?v=${__APP_VERSION__}&t=${Date.now()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    color: '#818cf8', textDecoration: 'none', fontSize: '0.83rem', fontWeight: 600,
                                    padding: '0.55rem 1.1rem', borderRadius: '99px',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                    background: 'rgba(99,102,241,0.07)',
                                }}
                            >
                                <Info size={13} /> Apri Manuale Ufficiale v{__APP_VERSION__}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
