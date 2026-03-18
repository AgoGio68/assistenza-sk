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
import { useAuth } from '../contexts/AuthContext';

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
    const { signInWithGoogle } = useAuth();

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

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Errore durante l\'accesso con Google');
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

                {isLogin && !isForgotPassword && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '1rem' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oppure</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                padding: '0.85rem',
                                borderRadius: 'var(--border-radius-md)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
                            Continua con Google
                        </button>
                    </>
                )}


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
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Novità &amp; Aggiornamenti</h2>
                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
                                Cronologia versioni &middot; versione attuale: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>v{__APP_VERSION__}</strong>
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <a
                                href={`/manuale.html?v=${__APP_VERSION__}&t=${Date.now()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    color: '#f1f5f9', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700,
                                    padding: '0.65rem 1.4rem', borderRadius: '99px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                                    letterSpacing: '0.01em',
                                }}
                            >
                                <Info size={14} /> Apri Manuale Ufficiale
                            </a>
                        </div>

                        {([
                            {
                                version: '3.1.19',
                                label: 'UI FINAL POLISH',
                                color: '#6366f1',
                                items: [
                                    'Fix Visibilità: Corretto l\'ultimo sfondo chiaro residuo nella sezione Dati Macchina.',
                                    'GitHub: Sincronizzazione completa di tutti i fix (Glow Engine, Firestore Overwrite, UI Contrast).'
                                ]
                            },
                            {
                                version: '3.1.18',
                                label: 'UI CONTRAST FIX',
                                color: '#6366f1',
                                items: [
                                    'Fix Visibilità: Rimosso il testo bianco su sfondo bianco nelle note tecniche.',
                                    'Fix Contrasto: Sostituiti tutti gli sfondi chiari nel modale con il tema scuro premium per garantire la leggibilità.',
                                    'Fix Input: Corretta la visibilità del calendario e dei selettori orari (ora bianchi su scuro).'
                                ]
                            },
                            {
                                version: '3.1.17',
                                label: 'SAVE TOTAL OVERWRITE',
                                color: '#10b981',
                                items: [
                                    'Refactoring: Il salvataggio ora SOVRASCRIVE completamente il database (no merge). Dati vecchi o corrotti vengono eliminati ad ogni salvataggio.',
                                    'Sicurezza: Bloccata definitivamente la funzione di cancellazione righe dal foglio Google. L\'App non elimina mai più nulla dal foglio.',
                                    'Sicurezza: Il foglio viene aggiornato SOLO nelle colonne G (matricola), H (data), I (commenti) — mai altro.'
                                ]
                            },
                            {
                                version: '3.1.16',
                                label: 'GLOW ENGINE v2',
                                color: '#f97316',
                                items: [
                                    'Refactoring Radicale: Il sistema di lampeggio ora legge i dati direttamente da Firestore invece del sistema di merge con il foglio Google, eliminando definitivamente i falsi positivi e i mancati lampeggi.',
                                    'Fix: Il pulsante Google Calendar non chiude più il modale, permettendo di cliccare Salva subito dopo.'
                                ]
                            },
                            {
                                version: '3.1.15',
                                label: 'GLOW FINAL FIX',
                                color: '#f97316',
                                items: [
                                    'Fix Definitivo: Il lampeggio arancione ora si attiva SOLO con la data inserita esplicitamente in App (Pianificazione). Le date del foglio Google (Colonne E e H) non causano più falsi lampeggi.'
                                ]
                            },
                            {
                                version: '3.1.14',
                                label: 'ACCURACY FIX',
                                color: '#38bdf8',
                                items: [
                                    'Precisione: Rimosso il lampeggio automatico basato sulla "Data Consegna" (Colonna E) per evitare falsi positivi dalla logica logistica.',
                                    'Focus: Il lampeggio arancione ora si attiva esclusivamente con le date confermate inserite in App o nella colonna specifica di installazione.'
                                ]
                            },
                            {
                                version: '3.1.13',
                                label: 'GLOW ENGINE RESTORED',
                                color: '#f97316',
                                items: [
                                    'Fix: Ripristinato il lampeggio arancione (Pianificate) e giallo (Da collaudare) che non apparivano più per mancanza di stili CSS.',
                                    'Integrazione: La "Data Consegna" del foglio Google (Colonna E) ora attiva correttamente il lampeggio arancione se la data è oggi o futura.'
                                ]
                            },
                            {
                                version: '3.1.12',
                                label: 'DB CLEANUP & FIX',
                                color: '#ef4444',
                                items: [
                                    'Feature: Aggiunto tasto "FIX" (Hard Reset) per Superadmin per ricalcolare i lampeggi date ed eliminare conflitti nel database locale.',
                                    'Fix: Risolto un bug che duplicava le scritte [COLLAUDATA] o [DA COLLAUDARE] nei commenti durante il salvataggio.'
                                ]
                            },
                            {
                                version: '3.1.11',
                                label: 'UI COMPACT & CONTRAST',
                                color: '#38bdf8',
                                items: [
                                    'UI/UX: Aggiunta opzione "Griglia Compatta" per visualizzare le card installazioni a metà grandezza.',
                                    'Leggibilità: Migliorato il contrasto di tutti i testi secondari su sfondo scuro (più luminosi e nitidi).'
                                ]
                            },
                            {
                                version: '3.1.10',
                                label: 'DATA VAULT & RESILIENCE',
                                color: '#f97316',
                                items: [
                                    'Database: Nuovo ID Semantico puro per rendere invulnerabili i dati caricati (immuni a sposta/copia righe).',
                                    'Feature: Aggiunta "Camera di Sicurezza" per recuperare e ricollegare i dati orfani (solo Admin).',
                                    'Fix: Spostata la colonna dello Stable ID alla colonna Z per evitare conflitti con note manuali.'
                                ]
                            },
                            {
                                version: '3.1.9',
                                label: 'FIX ROLES',
                                color: '#10b981',
                                items: [
                                    'Fix: Ripristinata la possibilità di assegnare ticket ai semplici Utenti (es. Vlad).',
                                    'Integrità: Mantenuto il blocco totale solo per i Superadmin.'
                                ]
                            },
                            {
                                version: '3.1.8',
                                label: 'PRIVACY & FILTERS',
                                color: '#6366f1',
                                items: [
                                    'Privacy: I Superadmin sono stati rimossi da tutte le liste utenti (Gestione, Assegnazione).',
                                    'Assegnazione: Disabilitata la possibilità di assegnare ticket ai Superadmin.'
                                ]
                            },
                            {
                                version: '3.1.7',
                                label: 'CUSTOM DFV & CLEANUP',
                                color: '#ec4899',
                                items: [
                                    'Feature: Campi del dettaglio installazione ora configurabili per la sezione DFV.',
                                    'Cleanup: Rimossi file residui e database temporanei dal progetto.'
                                ]
                            },
                            {
                                version: '3.1.6',
                                label: 'FIX VISIBILITY',
                                color: '#10b981',
                                items: [
                                    'Fixed: Ripristinata la visibilità delle installazioni manuali (come PIPPO).',
                                    'Migliorato il filtro di pulizia per essere più preciso.'
                                ]
                            },
                            {
                                version: '3.1.5',
                                label: 'CLEANUP',
                                color: '#6366f1',
                                items: [
                                    'Pulizia automatica: nascosti i record "fantasma" o vuoti che apparivano per errore.',
                                    'Migliorata la logica di sincronizzazione "Orphan" per una transizione più fluida.'
                                ]
                            },
                            {
                                version: '3.1.4',
                                label: 'STABILITY FIX',
                                color: '#ef4444',
                                items: [
                                    'Fixed: Risolto crash della pagina se i dati su Google Sheets sono malformati o hanno intestazioni errate.',
                                    'Maggiore resilienza: l\'app ora ignora righe incomplete senza bloccarsi.'
                                ]
                            },
                            {
                                version: '3.1.3',
                                label: 'STABLE IDS',
                                color: '#8b5cf6',
                                items: [
                                    'ID Stabili: ogni riga su Sheets ora ha un ID unico (colonna J) che previene la perdita di note se le righe vengono spostate.',
                                    'Anti-Sparizione: i record manuali non spariscono più durante il caricamento verso Google Sheets.'
                                ]
                            },
                            {
                                version: '3.1.2',
                                label: 'SHEET & DELETE',
                                color: '#f59e0b',
                                items: [
                                    'Possibilità di inserire nuove esportazioni manuali in cima al foglio Google (Riga 2).',
                                    'Implementata la cancellazione definitiva: eliminando un record sparirà sia da Firestore che dal Foglio Google.'
                                ]
                            },
                            {
                                version: '3.1.1',
                                label: 'FIX & SYNC',
                                color: '#10b981',
                                items: [
                                    'Possibilità di esportare e sincronizzare manualmente le Installazioni create tramite tasto Nuovo verso il foglio Google Sheets.',
                                    'Risolto il problema di collisione account Firebase durante il collegamento col Calendario Google che esponeva le Sezioni agli utenti standard.'
                                ]
                            },
                            {
                                version: '3.1.0',
                                label: 'FEATURE', // Added label for consistency
                                color: '#6366f1', // Added color for consistency
                                items: [ // Renamed 'changes' to 'items' for consistency
                                    'Aggiunta gestione Installazioni indipendente per la Seconda Sezione (v. Dfv/S2).',
                                    'Supporto all\'inserimento puramente manuale delle installazioni senza limitarsi al Foglio Google.',
                                    'Nuovo pulsante "Nuova Installazione" per aggiunte on-the-fly.',
                                ]
                            },
                            { version: '3.0.0', label: 'MAJOR RELEASE', color: '#ef4444', items: ['Aggiunta gestione multi-sezione configurabile (es. Assistenza SK vs Installazioni Esterne).', 'Fix doppi tag stato su file Google Sheets.', 'Rimosso prompt infinito di consenso Google.'] },
                            { version: '2.2.37', label: 'STABLE', color: '#10b981', items: ['Risolto problema Milani 653: stabilizzato ID univoco e corretto parsing date.', 'Rifinito ordinamento gerarchico: Arancione (Top), Blu (Centro), Giallo/Verde (Coda).'] },
                            { version: '2.2.36', label: 'FINAL', color: '#10b981', items: ['Implementata logica glow multi-colore: Arancione (Pianificate), Giallo (Da collaudare), Verde (Collaudate).', 'Ordinamento prioritario secondo gerarchia cliente.'] },
                            { version: '2.2.35', label: 'STABLE', color: '#10b981', items: ['Fix definitivo lampeggio casuale e ordinamento intelligente basato sull\'attualità delle date.'] },
                            { version: '2.2.34', label: 'FIX', color: '#10b981', items: ['Risolto problema lampeggio e ordinamento per installazioni in collaudo.', 'Implementata formattazione Calibri 16 automatica sul foglio Google.'] },
                            { version: '2.2.33', label: 'UI', color: '#6366f1', items: ['Regolati colori Google Sheets per una maggiore visibilità (Giallo e Verde vivaci).'] },
                            { version: '2.2.32', label: 'FIX', color: '#10b981', items: ['Rilevamento intelligente del foglio ORDINI per la colorazione automatica.'] },
                            { version: '2.2.31', label: 'FIX', color: '#10b981', items: ['Ottimizzazione colorazione righe e debug sincronizzazione fogli Google.'] },
                            { version: '2.2.30', label: 'FEATURE', color: '#6366f1', items: ['Colorazione automatica righe: il foglio Google diventa Giallo al salvataggio e Verde al collaudo.'] },
                            { version: '2.2.29', label: 'FIX', color: '#10b981', items: ['Ricerca potenziata: ora puoi cercare anche per Modello SK e Luogo di Installazione.', 'Risolto problema dei record duplicati nel rendering.'] },
                            { version: '2.2.28', label: 'FIX', color: '#10b981', items: ['Forzata schermata di consenso Google per garantire l\'attivazione dei permessi Sheets.'] },
                            { version: '2.2.27', label: 'FIX', color: '#10b981', items: ['Risolto slittamento dati: l\'app ora identifica le righe in modo intelligente anche se ne vengono aggiunte di nuove nel foglio.'] },
                            { version: '2.2.26', label: 'FIX', color: '#10b981', items: ['Correzione definitiva permessi Google Sheets (scopes).'] },
                            { version: '2.2.25', label: 'FIX', color: '#10b981', items: ['Risolto definitivamente errore di autorizzazione per la scrittura sui fogli Google.'] },
                            { version: '2.2.24', label: 'FIX', color: '#10b981', items: ['Risolto errore di autorizzazione (insufficient scopes) per la scrittura sui fogli Google.'] },
                            { version: '2.2.23', label: 'FEATURE', color: '#6366f1', items: ['Sincronizzazione bidirezionale: salvataggio dati (Data, Matricola, Commenti) direttamente sul foglio Google.'] },
                            { version: '2.2.22', label: 'FEATURE', color: '#6366f1', items: ['Importazione note integrali: se la colonna Modello SK inizia con ***, la nota viene importata completamente.'] },
                            { version: '2.2.21', label: 'FEATURE', color: '#6366f1', items: ['Pulsante "Accedi con Google" nella pagina iniziale.', 'Login e collegamento Calendario in un unico click.'] },
                            { version: '2.2.20', label: 'UX', color: '#f59e0b', items: ['Aggiunta modalità "Lista Compatta a 2 Colonne" per le Installazioni.', 'Allineamento perfetto layout a griglia interno.'] },
                            { version: '2.2.15', label: 'UX', color: '#f59e0b', items: ['Changelog accessibile direttamente dal pulsante sotto il form.', 'Rimosso selettore pillola Manuale/Changelog: dedicato ora solo alla cronologia.'] },
                            { version: '2.2.14', label: 'UI POLISH', color: '#8b5cf6', items: ['Selettore Manuale/Changelog rimpiazzato con pillola Glassmorphism e transizioni fluide.'] },
                            { version: '2.2.13', label: 'DOC', color: '#0ea5e9', items: ['Manuale utente riscritto: ordinamento installazioni, Google Calendar, moduli SuperAdmin.'] },
                            { version: '2.2.12', label: 'FIX', color: '#10b981', items: ['Griglia allineata per "Moduli da attivare": colonne proporzionali, ordine visivo garantito.'] },
                            { version: '2.2.11', label: 'LAYOUT', color: '#f59e0b', items: ['Checklist moduli flex-wrap compatto.', 'Impostazioni Admin: layout a griglia, larghezza piena.'] },
                            { version: '2.2.10', label: 'FEATURE', color: '#6366f1', items: ['Sede di installazione (Cliente \u2014 Città) nella card e nel titolo evento Google Calendar.'] },
                            { version: '2.2.9', label: 'SUPERADMIN', color: '#ec4899', items: ['Lista Moduli Attivabili configurabile dal pannello Impostazioni senza toccare codice.'] },
                            { version: '2.2.8', label: 'FEATURE', color: '#6366f1', items: ['Ordinamento intelligente: installazioni con data evidenziate e in prima posizione.', 'Nuova checklist interattiva Moduli nel Dettaglio Installazione.'] },
                            { version: '2.2.7', label: 'FIX', color: '#10b981', items: ['Parser CSV riscritto per note multiriga nelle celle Google Sheets.'] },
                            { version: '2.2.6', label: 'FIX', color: '#10b981', items: ['Componenti Estratti riconosciuti anche con celle vuote nel foglio.'] },
                            { version: '2.2.5', label: 'LAYOUT', color: '#f59e0b', items: ['Sezione "Applicazioni" rimossa: più spazio ai Componenti Estratti automatici.'] },
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


                    </div>
                </div>
            )}
        </div>
    );
};
