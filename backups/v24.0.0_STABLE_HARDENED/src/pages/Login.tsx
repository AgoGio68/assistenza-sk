import React, { useState } from 'react';
import { ManualeModal } from '../components/ManualeModal';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { LogIn, UserPlus, Mail, ArrowLeft, Globe, BookOpen, ShieldCheck } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

const LANGS: { code: any; flag: string; label: string }[] = [
    { code: 'it', flag: '🇮🇹', label: 'IT' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
];

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
    const { t, language, setLanguage } = useLanguage();
    const [langOpen, setLangOpen] = useState(false);

    const appName = import.meta.env.VITE_APP_NAME || 'ASSISTENZA SK';

    // Layout Reset on Mount
    React.useEffect(() => {
        // Rimuove eventuali classi o stili applicati al body dalla dashboard
        document.body.className = '';
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        
        // Assicura che l'attributo data-theme sia coerente se necessario
        // document.body.removeAttribute('data-theme'); 
    }, []);

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
                const redirectPath = localStorage.getItem('redirectPath');
                if (redirectPath) {
                    localStorage.removeItem('redirectPath');
                    navigate(redirectPath);
                } else {
                    navigate('/');
                }
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            let errorMessage = err.message || t('login.errorDefault');
            if (err.code === 'auth/user-not-found') errorMessage = t('login.errorNotFound');
            if (err.code === 'auth/wrong-password') errorMessage = t('login.errorWrongPassword');
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            {/* INLINE LANGUAGE SWITCHER FOR LOGIN PAGE */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50 }}>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setLangOpen((v) => !v)}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Globe size={14} /> {LANGS.find(l => l.code === language)?.flag} {language.toUpperCase()}
                    </button>
                    {langOpen && (
                        <div style={{ position: 'absolute', top: '120%', right: 0, background: 'var(--panel-bg)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            {LANGS.map(l => (
                                <button
                                    key={l.code}
                                    onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                                    style={{ display: 'block', width: '100%', padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    {l.flag} {l.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-panel auth-card">
                <img
                    src={settings.logoUrl || '/logo-sk.jpg'}
                    alt={settings.appName || 'LMS Logo'}
                    className="auth-logo"
                />
                <h2
                    style={{
                        textAlign: 'center',
                        marginBottom: '0.2rem',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #f1f5f9 30%, #94a3b8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    {settings.appName || appName}
                </h2>
                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '1.75rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        letterSpacing: '0.05em',
                    }}
                >
                    v{__APP_VERSION__}
                </div>

                <h3
                    style={{
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500,
                        fontSize: '1rem',
                    }}
                >
                    {isForgotPassword ? t('login.forgotPassword') : isLogin ? t('login.title') : t('login.register')}
                </h3>

                {error && (
                    <div
                        style={{
                            background: 'rgba(244,63,94,0.12)',
                            border: '1px solid rgba(244,63,94,0.25)',
                            color: '#fb7185',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--border-radius-sm)',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                        }}
                    >
                        {error}
                    </div>
                )}

                {message && (
                    <div
                        style={{
                            background: 'rgba(16,185,129,0.12)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            color: '#6ee7b7',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--border-radius-sm)',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                        }}
                    >
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label
                            htmlFor="email"
                            style={{
                                display: 'block',
                                marginBottom: '0.4rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}
                        >
                            {t('login.emailLabel')}
                        </label>
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
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '0.4rem',
                                }}
                            >
                                <label
                                    htmlFor="password"
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                    }}
                                >
                                    {t('login.passwordLabel')}
                                </label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--accent-teal)',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {t('login.forgotLink')}
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
                            <>
                                <Mail size={20} /> {t('login.submitReset')}
                            </>
                        ) : isLogin ? (
                            <>
                                <LogIn size={20} /> {t('login.submit')}
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} /> {t('login.submitRegister')}
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    {isForgotPassword ? (
                        <button
                            onClick={() => setIsForgotPassword(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-teal)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.9rem',
                            }}
                        >
                            <ArrowLeft size={16} /> {t('login.backToLogin')}
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                            }}
                        >
                            {isLogin ? t('login.noAccount') : t('login.hasAccount')}
                        </button>
                    )}
                    <br />
                    <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        style={{
                            marginTop: '1rem',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                        }}
                    >
                        <BookOpen size={14} /> Guida all'Utilizzo
                    </button>
                </div>
            </div>

            {/* Note di Rilascio / Changelog */}
            <div
                className="glass-panel"
                style={{
                    maxWidth: '450px',
                    margin: '1.5rem auto 0 auto',
                    padding: '1.25rem',
                    background: 'rgba(20, 184, 166, 0.05)',
                    border: '1px solid rgba(20, 184, 166, 0.2)',
                    color: 'var(--text-secondary)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ShieldCheck size={20} style={{ color: 'var(--accent-teal)' }} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Note di Rilascio v24.0.0 (Security & Stability)
                    </h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>Backend Security:</strong> Implementato Role-Based Access Control (RBAC) via Custom Claims e gestione rigorosa delle API (HttpsError 403).</li>
                    <li><strong>Data Integrity:</strong> Prevenzione di Quota Leak (via Firestore Transactions) e stato Split-Brain tramite scritture atomiche (writeBatch).</li>
                    <li><strong>Memory Optimization:</strong> Chiuso memory leak critico sul client ottimizzando il lazy fetching e limitando le query Firestore attive.</li>
                    <li><strong>Code Quality:</strong> Rimozione del debito tecnico e adozione di tipizzazione rigorosa TypeScript (eliminazione type any).</li>
                </ul>
            </div>


            {/* ═══════════════════════════════════════════════════════════
                 MANUALE OPERATIVO GESTIONALE  —  VER 21.0.0
            ═══════════════════════════════════════════════════════════ */}
            {showGuide && <ManualeModal onClose={() => setShowGuide(false)} />}
        </div>
    );
};
