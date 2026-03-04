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
    const [viewMode, setViewMode] = useState<'guide' | 'changelog'>('guide');

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
                    Versione 1.9.1
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
                        onClick={() => { setShowGuide(true); setViewMode('guide'); }}
                        style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}
                    >
                        <Info size={16} /> Guida e Versioni
                    </button>
                </div>
            </div>

            {/* Modale Guida e Versioni */}
            {showGuide && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                        <button
                            onClick={() => setShowGuide(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={24} />
                        </button>

                        {viewMode === 'guide' ? (
                            <>
                                <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: '2rem', width: '100%', gap: '1rem' }}>
                                    <a
                                        href="/manuale.html?v=1.9.1"
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
                                        <Info size={24} /> APRI MANUALE UFFICIALE v1.9.1
                                    </a>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
                                        Guida professionale dettagliata per Utenti, Admin e Superadmin.
                                    </p>
                                </section>

                            </>
                        ) : (
                            <>
                                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', textAlign: 'center' }}>Cronologia Aggiornamenti (Changelog)</h3>
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
