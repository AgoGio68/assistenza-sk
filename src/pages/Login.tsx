import React, { useState, useEffect } from 'react';
import { ManualeModal } from '../components/ManualeModal';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { LogIn, UserPlus, Mail, ArrowLeft, Globe, BookOpen } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

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
    const { currentUser, isApproved, loading: authLoading } = useAuth();
    const { settings } = useSettings();
    const { t, language, setLanguage } = useLanguage();
    const [langOpen, setLangOpen] = useState(false);

    const appName = import.meta.env.VITE_APP_NAME || 'ASSISTENZA SK';

    // Se l'utente è già loggato e approvato, reindirizza subito alla dashboard evitando il flash del login
    useEffect(() => {
        if (!authLoading && currentUser && !currentUser.isAnonymous && isApproved) {
            navigate('/', { replace: true });
        }
    }, [currentUser, isApproved, authLoading, navigate]);

    // Layout Reset on Mount
    useEffect(() => {
        document.body.className = '';
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
        };
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
                localStorage.removeItem('redirectPath');
                // SEC-05: accetta SOLO path interni (inizia con '/' ma non con '//')
                if (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//') && !redirectPath.includes(':')) {
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
            const firebaseErrorMap: Record<string, string> = {
                'auth/user-not-found':      t('login.errorNotFound'),
                'auth/wrong-password':      t('login.errorWrongPassword'),
                'auth/invalid-credential':  t('login.errorWrongPassword'),
                'auth/email-already-in-use': 'Email già registrata. Prova ad accedere.',
                'auth/weak-password':       'La password deve essere di almeno 6 caratteri.',
                'auth/too-many-requests':   'Troppi tentativi. Riprova tra qualche minuto.',
                'auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
                'auth/invalid-email':       'Indirizzo email non valido.',
                'auth/user-disabled':       'Account disabilitato. Contatta l\'amministratore.',
            };
            const errorMessage = firebaseErrorMap[err.code] || t('login.errorDefault');
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
            </div>
        );
    }

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

            <div className="glass-panel auth-card" style={{ backgroundColor: '#1e293b' }}>
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


            {/* ═══════════════════════════════════════════════════════════
                 MANUALE OPERATIVO GESTIONALE  —  VER 21.0.0
            ═══════════════════════════════════════════════════════════ */}
            {showGuide && <ManualeModal onClose={() => setShowGuide(false)} />}
        </div>
    );
};
