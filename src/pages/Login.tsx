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
    const [viewMode, setViewMode] = useState<'guide' | 'changelog'>('guide');

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
                        onClick={() => { setShowGuide(true); setViewMode('guide'); }}
                        style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                    >
                        <Info size={14} /> Guida e Versioni
                    </button>
                </div>
            </div>

            {/* Modale Guida e Versioni */}
            {showGuide && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                        <button
                            onClick={() => setShowGuide(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', justifyContent: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <button
                                onClick={() => setViewMode('guide')}
                                style={{ background: 'none', border: 'none', fontSize: '1.1rem', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: viewMode === 'guide' ? 700 : 400, color: viewMode === 'guide' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: viewMode === 'guide' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
                            >
                                Manuale
                            </button>
                            <button
                                onClick={() => setViewMode('changelog')}
                                style={{ background: 'none', border: 'none', fontSize: '1.1rem', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: viewMode === 'changelog' ? 700 : 400, color: viewMode === 'changelog' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: viewMode === 'changelog' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
                            >
                                Changelog
                            </button>
                        </div>

                        {viewMode === 'guide' ? (
                            <>
                                <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: '2rem', width: '100%', gap: '1rem' }}>
                                    <a
                                        href={`/manuale.html?v=${__APP_VERSION__}&t=${Date.now()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            padding: '1rem 2rem',
                                            textDecoration: 'none',
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
                                            width: 'auto',
                                            maxWidth: '90%'
                                        }}
                                    >
                                        <Info size={24} /> APRI MANUALE UFFICIALE v{__APP_VERSION__}
                                    </a>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
                                        Guida professionale dettagliata per Utenti, Admin e Superadmin.
                                    </p>
                                </section>

                            </>
                        ) : (
                            <>
                                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', textAlign: 'center' }}>Cronologia Aggiornamenti (Changelog)</h3>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.13 - Aggiornamento Manuale Ufficiale</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Documentazione:</strong> Il manuale utente integrato è stato riportato in pari con tutte le ultimissime novità, in particolar modo riguardo l'ordinamento avanzato, il calendario intelligente e la gestione moduli configurabile.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.12 - Allineamento Checklist Moduli</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Checklist Moduli (Layout):</strong> Ripristinata la visualizzazione dinamica per colonne multiple allineate invece della disposizione in singola linea fluida della 2.2.11. Il design conserva la compattezza limitando la larghezza unitaria ma mantenendo ordine visivo in griglia.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.11 - Ottimizzazione Spazi Layout</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Checklist Moduli:</strong> I pulsanti dei moduli attivabili nel dettaglio installazione sono stati resi più compatti, posizionandosi dinamicamente per occupare solo la larghezza del loro testo.</li>
                                        <li><strong>Impostazioni Admin:</strong> Sfruttata l'intera larghezza della pagina nel pannello Impostazioni per affiancare logicamente i blocchi di opzioni ed evitare una pagina eccessivamente lunga su schermi larghi.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.10 - Sedi nelle Installazioni</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Dettaglio Località:</strong> L'interfaccia delle installazioni adesso espone anche la sede di installazione (es. Cliente - Città) per una rapida identificazione, e questo stesso formato verrà riportato come titolo negli eventi sincronizzati con Google Calendar.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.9 - Moduli Dinamici Custom</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Pannello Amministratore:</strong> Configurazione completa e customizzabile per le "Voci Attivabili" del collaudo, gestibili totalmente dall'apposito pannello "Impostazioni Grafica" per l'aggiunta o rimozione rapida.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.8 - Ordinamento Installazioni e Nuovi Moduli</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Ordinamento Installazioni:</strong> Le installazioni con una data di programmata vengono evidenziate e spostate in prima posizione, le altre vengono raggruppate e visualizzate rigorosamente in ordine alfabetico.</li>
                                        <li><strong>Selezione Moduli Dettaglio:</strong> Aggiunta all'interno del riquadro Dettagli delle Installazioni una nuova pratica checklist con i moduli attivabili al clic.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.7 - Rendering Note Multiriga</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Fix Compatibilità CSV:</strong> Riscritto completamente il motore di estrazione CSV per supportare l'inclusione di note estremamente complesse e formattate su più righe all'interno della singola cella Google.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.6 - Allineamento Dinamico Colonne</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Motore di Lettura CSV:</strong> Il parser riconosce ora i "Componenti Estratti" in modo fluido, indipendentemente dalla presenza di colonne vuote prima o dopo le Note nel foglio Google originale.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.5 - Riorganizzazione Layout Installazioni</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Nuovo Layout:</strong> La sezione "Applicazioni da aggiungere" è stata rimossa per dare maggiore spazio e risalto ai Componenti Estratti automaticamente dal foglio Google, ottimizzando l'area di lavoro.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.4 - Hotfix Sincronizzazione</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>ID Foglio e GID:</strong> L'app riconosce ora correttamente l'ID del tab specifico (GID) inserito nelle impostazioni per scaricare con precisione millimetrica i codici estratti in background dallo script specchio.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.3 - Sincronizzazione Componenti Macchina (Notes)</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Componenti Estratti:</strong> I codici dei componenti vengono ora estratti automaticamente dai commenti del Google Sheet e visualizzati nel Modale Installazione in un riquadro dedicato.</li>
                                        <li><strong>Sincronizzazione Background:</strong> Implementata automazione `onEdit` nel Google Sheet per l'aggiornamento real-time e sicuro dei dati verso l'App.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.2.2 - Sincronizzazione Installazioni</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Calendario Google:</strong> Integrazione con Google Calendar per la pianificazione automatica delle installazioni nella loro scheda di dettaglio.</li>
                                        <li><strong>Check Visibili:</strong> Aggiunto effetto visivo luminoso (luce arancione pulsante) sulle schede delle installazioni pronte ad essere verificate.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.1.0 - Assegnazioni e Permessi Granulari</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li><strong>Assegnazione Rapida:</strong> Nuova interfaccia opzionale in fase di creazione del ticket per smistare subito il lavoro a un collega senza dover passare dalla vista dettagli.</li>
                                        <li><strong>Poteri Granulari:</strong> Nuovo pannello dedicato in Impostazioni per il controllo capillare dei permessi: si può decidere se gli admin possono spostare o forzare la chiusura di ticket altrui, e se gli utenti possono auto-assegnare assistenza.</li>
                                        <li><strong>Tracciamento Spostamenti:</strong> Integrazione tra presa in carico, calendario e permessi per una gestione team più snella.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.8 - Google Auth Fix</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Corretto l'errore tecnico (credential-already-in-use) che si verificava cercando di riconnettere il Calendario a Google. Adesso puoi cliccare "Collega Google" in modo sicuro anche se precedentemente interrotto.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.7 - Sblocco Sincronizzazione</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Risolto il blocco "Invisibile" del calendario: i pulsanti per autorizzare Google erano precedentemente bloccati ed esclusivi per il solo SuperAdmin. Ora tutti gli Admin possono utilizzare la funzionalità se collegati a Google!</li>
                                        <li>Aggiunto un popup di avviso per quando l'utente prova a calendarizzare un intervento dimenticando di collegare prima l'account Google.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.6 - Hotfix Sincronizzazione</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Risolto bug che impediva al tasto "Sposta" di attivare la sincronizzazione a Google Calendar automaticamente.</li>
                                        <li>Avviso automatico quando il collegamento a Google Calendar è scaduto (richiede ricollegamento per sicurezza fuso orario).</li>
                                        <li>I Ticket aperti in dettaglio si chiudono finalmente anche cliccando Rilascia o Sposta.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.5 - UX e Fix Minori</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Le aziende "Nuove" vengono ora salvate direttamente nell'autocompletamento generale.</li>
                                        <li>Il modulo nuovo ticket viene svuotato correttamente dopo l'invio.</li>
                                        <li>Chiusura automatica dei modali su click di "Rilascia".</li>
                                        <li>Orario di default impostato alle 08:00 quando si assegna un giorno all'intervento.</li>
                                        <li>Format Data Calendar ritoccato per compatibilità assoluta con il timezone.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.3 - Versione Dinamica</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Centralizzazione automatica della versione (da package.json).</li>
                                        <li>Risolto bug persistenza visualizzazione versione.</li>
                                        <li>Allineamento totale tra codice e interfaccia.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.2 - Fix Icone Vista Compatta</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Aggiunto tasto "Zap" anche nella vista compatta (Griglia).</li>
                                        <li>Migliorata la reattività dell'animazione di lampeggio.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.1 - Evidenziazione Ticket</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Nuova funzione "Zap" per far lampeggiare i ticket prioritari.</li>
                                        <li>Persistenza dell'evidenziazione su database Firebase.</li>
                                        <li>Miglioramenti alla sicurezza delle chiavi API.</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary-color)', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 2.0.0 - Automazione Fatturazione</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Riconoscimento automatico delle righe fatturate dalla colonna "Consegna" del foglio Google.</li>
                                        <li>Raggruppamento visivo delle installazioni fatturate in fondo alla lista (Grigio).</li>
                                        <li>Rimozione gestione manuale della fatturazione per maggiore efficienza.</li>
                                        <li>Aggiornamento progetto Firebase a "assistenza-sk".</li>
                                    </ul>
                                </div>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.9 - Prefisso Compilabile e App Avanzate</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Il Prefisso Matricola ora entra direttamente nel campo allo scatto del focus.</li>
                                        <li>Possibilità di eliminare singolarmente le applicazioni aggiunte al volo.</li>
                                        <li>Comparsa di un campo "Quantità" automatico se l'applicazione contiene la parola "Canali".</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.8 - Mobile Ready & Prefissi</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Risolto il problema di visualizzazione (overflow) su cellulari in modalità verticale.</li>
                                        <li>Aggiunta la possibilità per l'Admin di impostare un Prefisso Matricola fisso.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.7 - Cache Force Update</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Implementato sistema di aggiornamento forzato della cache (Cache-Busting).</li>
                                        <li>Riorganizzazione finale del layout modal per massima usabilità.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.6 - Ottimizzazione Layout</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Riorganizzato layout modal: stati di collaudo e fatturazione spostati in basso.</li>
                                        <li>Checklist applicazioni spostata in primo piano sopra le note.</li>
                                        <li>Corretto allineamento campi "Dati Macchina" per evitare sovrapposizioni.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.5 - Layout Professionale</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Restyling completo del modal dettaglio: più spazio per le note e design premium.</li>
                                        <li>Risolto bug dei duplicati tramite identificazione univoca delle righe (rowId).</li>
                                        <li>Migliorata la logica di ricerca e filtraggio clienti.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.4 - Risoluzione Duplicati</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Corretto bug critico che causava la visualizzazione di schede duplicate per ordini multi-macchina.</li>
                                        <li>Implementata chiave univoca composta (Ordine + Matricola + Modello) per ogni singola riga.</li>
                                        <li>Migliorata la stabilità del rendering della lista installazioni.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.3 - Fix Duplicati e Persistenza</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Risolto bug che mostrava schede duplicate in caso di dati ridondanti nel foglio.</li>
                                        <li>Migliorata la logica di sincronizzazione Firestore/Google Sheets.</li>
                                        <li>Confermata la protezione delle modifiche locali durante il ricaricamento dei dati.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.2 - Gestione Dinamica Avanzata</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Implementati stati colorati: Blu (Attesa), Giallo (Da Collaudare), Verde (Collaudata).</li>
                                        <li>Nuova checklist "Applicazioni da aggiungere" con gestione automatica colori.</li>
                                        <li>Possibilità di pianificare Data e Ora precisa per le installazioni.</li>
                                        <li>Aggiunta gestione Fatturazione e Eliminazione schede.</li>
                                        <li>Editing completo di tutti i campi dell'installazione.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.1 - Dettagli e Note</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Aggiunto popup di dettaglio cliccando sulle schede installazione.</li>
                                        <li>Possibilità per gli Admin di salvare note extra persistenti su Firestore.</li>
                                        <li>Sincronizzazione automatica e indicatore visivo delle note presenti.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.9.0 - Gestione Installazioni</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Nuova sezione "Installazioni" integrata con Google Sheets.</li>
                                        <li>Dashboard dedicata con ricerca e monitoraggio consegne.</li>
                                        <li>Controllo attivazione sezione dal Pannello Admin.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.8.0 - Milestone Stable</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Versione stabile di riferimento per nuove funzionalità.</li>
                                        <li>Include tutte le ottimizzazioni UX e bugfix della serie 1.7.x.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.9 - UX & Persistenza</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Chiusura ticket istantanea nella lista (UI ottimistica).</li>
                                        <li>Salvataggio automatico dei dati azienda per i nuovi ticket.</li>
                                        <li>Migliorata la centratura della guida su dispositivi mobili.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.8 - Formattazione Report</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Report CSV: unificata colonna durata (formato HH:mm).</li>
                                        <li>Report CSV: testi convertiti automaticamente in tutto MAIUSCOLO.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.7 - Correzioni Report</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Corretto bug nell'export CSV che disallineava le colonne.</li>
                                        <li>Migliorata la compatibilità del report con Microsoft Excel.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.6 - Report e Profilo</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Nuova Pagina Profilo con statistiche personali e gestione nome.</li>
                                        <li>Export CSV potenziato con durata interventi e nomi completi.</li>
                                        <li>Statistiche tempo totale interventi nella dashboard amministratore.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.5 - Dettagli Admin</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Aggiunti nomi e date completa (apertura/chiusura) nei dettagli ticket admin.</li>
                                        <li>Migliorata la visibilità del flusso di gestione del ticket.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.4 - Durata Intervento</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Aggiunta possibilità di inserire la durata dell'intervento alla chiusura.</li>
                                        <li>Visualizzazione durata nel Pannello Admin.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.3 - Diagnostica</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Migliorati i messaggi di errore per la sincronizzazione del calendario.</li>
                                        <li>Ottimizzata la creazione degli eventi Google.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.2 - Hotfix Import</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Risolto errore di caricamento modulo `firebase/auth`.</li>
                                        <li>Corretta gestione dei permessi per il collegamento account.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.1 - Stabilità Google</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Utilizzo di `linkWithPopup` per una migliore gestione della sessione.</li>
                                        <li>Risolti potenziali conflitti di account durante il collegamento.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.7.0 - Permessi & Debug</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Integrazione Calendario ristretta ai soli Superadmin.</li>
                                        <li>Migliorato il logging degli errori per il collegamento Google.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.6.9 - Calendario Google</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                                        <li>Integrazione con Google Calendar per la pianificazione degli interventi.</li>
                                        <li>Nuovo modal "Prendi in Carico" con scelta data/ora.</li>
                                        <li>Pulsante per collegare/scollegare l'account Google.</li>
                                        <li>Visibilità creatore ticket estesa a tutte le viste.</li>
                                    </ul>
                                </div>

                                <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Versione 1.6.8 - Refactoring & Visibilità</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Refactoring:</strong> Suddivisione del Pannello Admin in componenti modulari per una migliore manutenibilità.</li>
                                        <li><strong>Visibilità:</strong> Visualizzazione immediata del creatore e dell'assegnatario su ogni ticket.</li>
                                    </ul>
                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.7 (Activation Hash Fix)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Bug Fix:</strong> Risolto il fallimento nella riattivazione manuale legato al disallineamento dell'ambiente di calcolo.</li>
                                    </ul>
                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.6 (Activation Bypass)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Fix Login:</strong> Modificata la validazione della licenza per consentire l'accesso immediato anche in caso di variazioni ritardate nell'ambiente server.</li>
                                    </ul>
                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.5 (Hotfix: Activation Loop)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Fix Attivazione:</strong> Risolto il problema che richiedeva l'inserimento continuo del codice ad ogni refresh della pagina a causa di un timeout server.</li>
                                    </ul>
                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.3 (Pulizia Dati)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Eliminazione Mensile:</strong> Gli amministratori possono ora eliminare massivamente tutti i ticket vecchi filtrandoli per anno e mese.</li>
                                        <li><strong>Eliminazione Singola:</strong> Aggiunto pulsante nei dettagli del pannello admin per rimuovere definitivamente un singolo ticket.</li>
                                    </ul>
                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.2 (Bugfix Assegnazioni)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Bug Fix:</strong> Corretto un difetto visivo che mostrava l'ID utente invece del nome nel campo "In carico a" e nei dettagli del referente senza telefono.</li>
                                    </ul>
                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.1 (Photo Sync & Note Admin)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Upload Foto:</strong> Aggiunta la possibilità di inserire fino a 3 foto durante la creazione dei ticket con compressione intelligente.</li>
                                        <li><strong>Poteri Admin:</strong> Gli amministratori possono ora modificare le note/appunti di qualsiasi ticket in qualsiasi momento (anche non assegnato a loro).</li>
                                        <li><strong>Storage Alert:</strong> Inserito modulo SuperAdmin per alert limiti Firebase Storage (5GB Gratuiti).</li>
                                    </ul>

                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.6.0 (Security & Licensing)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Licensing System:</strong> Nuovo blocco di attivazione basato su Codice Richiesta unico per ogni Istanza Firebase.</li>
                                        <li><strong>Code Obfuscation:</strong> Implementato sistema di protezione del codice sorgente (JS Obfuscator) per prevenire il reverse engineering.</li>
                                        <li><strong>Provisioning Autonomo:</strong> Script automatico per la creazione istantanea dell'account SuperAdmin e configurazione iniziale del Database.</li>
                                    </ul>

                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.5.4 (UI & Mobile optimization)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Mobile Lock:</strong> Impedito lo zoom involontario su dispositivi mobile per un'esperienza più vicina a un'app nativa.</li>
                                        <li><strong>Documentation:</strong> Ristrutturazione completa della guida utente e sezione changelog dedicata.</li>
                                        <li><strong>UX Professional:</strong> Migliorata la leggibilità dei pannelli informativi alla login.</li>
                                    </ul>

                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.5.3 (Bug Fix & stability)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li>Ottimizzazione caricamento iniziale e correzioni minori al layout.</li>
                                    </ul>

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
                                    </ul>

                                    <h4 style={{ color: 'var(--secondary-color)' }}>v1.5.0 (Global Settings)</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <li><strong>Global Settings:</strong> Modifica Colori Globali e Logo in tempo reale (Solo SuperAdmin).</li>
                                        <li><strong>Ottimizzazione:</strong> Schermo intero sfruttato senza limiti laterali.</li>
                                        <li><strong>Ricerca & Analitiche:</strong> Dashboard con barra di ricerca, filtri e grafici visuali.</li>
                                    </ul>

                                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                                        Vedere versioni precedenti nel database di assistenza SK.
                                    </div>
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={() => setShowGuide(false)} className="btn btn-primary" style={{ width: '100%' }}>
                                Chiudi
                            </button>

                            <button
                                onClick={() => setViewMode(viewMode === 'guide' ? 'changelog' : 'guide')}
                                className="btn"
                                style={{
                                    width: '100%',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--primary-color)',
                                    color: 'var(--primary-color)'
                                }}
                            >
                                {viewMode === 'guide' ? 'Visualizza Changelog' : 'Torna alla Guida'}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};
