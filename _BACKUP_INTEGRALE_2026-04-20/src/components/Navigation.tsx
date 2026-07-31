import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, PlusCircle, Settings, LogOut, Truck, Ticket, Calendar, Sun, Moon, Globe, Table } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';
import { RapportiniQuickButton } from './RapportiniQuickButton';

// ─── Theme helpers ────────────────────────────────────────────────
const getInitialTheme = (): 'dark' | 'light' => {
    const saved = localStorage.getItem('app-theme') as 'dark' | 'light' | null;
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
};

const applyTheme = (theme: 'dark' | 'light') => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
};

const LANGS: { code: Language; flag: string; label: string }[] = [
    { code: 'it', flag: '🇮🇹', label: 'Italiano' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

export const Navigation: React.FC = () => {
    const { logout, isAdmin, userProfile, userSections } = useAuth();
    const { settings } = useSettings();
    const { t, language, setLanguage } = useLanguage();
    const appName = settings.appName || 'ASSISTENZA SK';

    const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    const isLight = theme === 'light';

    const navClass = ({ isActive }: { isActive: boolean }) => 'nav-link-btn' + (isActive ? ' active' : '');

    const currentLang = LANGS.find((l) => l.code === language) || LANGS[0];

    return (
        <nav
            className="nav-fixed-top"
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--nav-padding)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(5, 10, 22, 0.96)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isLight
                    ? '0 1px 0 rgba(79,70,229,0.08), 0 2px 12px rgba(0,0,0,0.06)'
                    : '0 1px 0 rgba(99,102,241,0.12), 0 4px 24px rgba(0,0,0,0.4)',
                transition: 'all 0.28s ease',
            }}
        >
            {/* Left: Brand */}
            <NavLink
                to="/profile"
                className="nav-brand-comp-link"
                style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                }}
                title={t('nav.profile')}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="nav-profile-stack">
                    <span className="nav-brand-name-mobile">
                        {userProfile?.displayName?.split(' ')[0] || userProfile?.email?.split('@')[0] || t('common.user')}
                    </span>
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-teal))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: 'var(--glow-indigo)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'white',
                        }}
                    >
                        {(userProfile?.displayName || userProfile?.email || 'U')[0].toUpperCase()}
                    </div>
                </div>
                <div className="nav-brand-desktop-info hide-mobile" style={{ marginLeft: '0.75rem' }}>
                    <span className="nav-brand-name">{userProfile?.displayName || userProfile?.email || appName}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        v{__APP_VERSION__} · {appName}
                    </span>
                </div>
            </NavLink>

            {/* Right: Nav links */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                }}
            >

                <NavLink to="/" end className={navClass} title={t('nav.dashboard')}>
                    <LayoutDashboard size={22} className="nav-icon-mobile" color={settings.navIconColors?.dashboard || '#3b82f6'} /> <span className="hide-mobile">{t('nav.dashboard')}</span>
                </NavLink>

                <NavLink to="/calendar" className={navClass} title={t('nav.calendar')}>
                    <Calendar size={22} className="nav-icon-mobile" color={settings.navIconColors?.calendar || '#10b981'} /> <span className="hide-mobile">{t('nav.calendar')}</span>
                </NavLink>

                {userSections.includes('sk') && (
                    <NavLink to="/tickets" className={navClass} title={t('nav.tickets')}>
                        <Ticket rotate={-90} size={22} className="nav-icon-mobile" color={settings.navIconColors?.tickets || '#f59e0b'} /> <span className="hide-mobile">{t('nav.tickets')}</span>
                    </NavLink>
                )}

                {settings.section2Enabled && userSections.includes('s2') && (
                    <NavLink
                        to="/s2"
                        className={navClass}
                        title={`Ticket ${settings.section2Name || t('section.s2')}`}
                        style={({ isActive }) =>
                            isActive
                                ? {
                                      color: settings.section2Color || 'var(--accent-teal)',
                                      borderColor: settings.section2Color || 'var(--accent-teal)',
                                  }
                                : {}
                        }
                    >
                        <Ticket size={22} className="nav-icon-mobile" color={settings.navIconColors?.tickets || '#f59e0b'} /> <span className="hide-mobile">{settings.section2Name || t('section.s2')}</span>
                    </NavLink>
                )}

                {(settings.enableInstallations || isAdmin) && (
                    <NavLink to="/installations" className={navClass} title={t('nav.installations')}>
                        <Truck size={22} className="nav-icon-mobile" color={settings.navIconColors?.installations || '#06b6d4'} /> <span className="hide-mobile">{t('nav.installations')}</span>
                    </NavLink>
                )}
                
                {isAdmin && (
                    <NavLink to="/sheet/ordini" className={navClass} title="Foglio Ordini">
                        <Table size={22} className="nav-icon-mobile" color="#a855f7" /> <span className="hide-mobile">Ordini</span>
                    </NavLink>
                )}

                {settings.section2Enabled && settings.section2InstallationsEnabled && userSections.includes('s2') && (
                    <NavLink
                        to="/s2/installations"
                        className={navClass}
                        title={`Inst. ${settings.section2Name || t('section.s2')}`}
                        style={({ isActive }) =>
                            isActive
                                ? {
                                      color: settings.section2Color || 'var(--accent-teal)',
                                      borderColor: settings.section2Color || 'var(--accent-teal)',
                                  }
                                : {}
                        }
                    >
                        <Truck size={22} className="nav-icon-mobile" color={settings.navIconColors?.installations || '#06b6d4'} /> <span className="hide-mobile">Inst. {settings.section2Name || 'S2'}</span>
                    </NavLink>
                )}

                {(isAdmin || settings.allowUserTicketCreation) && (
                    <NavLink to="/create" className={navClass} title={t('nav.newTicket')}>
                        <PlusCircle size={22} className="nav-icon-mobile" color={settings.navIconColors?.create || '#ec4899'} /> <span className="hide-mobile">{t('nav.newTicket')}</span>
                    </NavLink>
                )}

                {isAdmin && (
                    <NavLink to="/admin" className={navClass} title={t('nav.admin')}>
                        <Settings size={22} className="nav-icon-mobile" color={settings.navIconColors?.admin || '#6366f1'} /> <span className="hide-mobile">{t('nav.admin')}</span>
                    </NavLink>
                )}

                {/* ─── Rapportini Quick Button ─────────────────────── */}
                <RapportiniQuickButton variant="nav" showBadge={isAdmin} color={settings.navIconColors?.rapportini || '#14b8a6'} />

                {/* ─── Language Switcher ──────────────────────────── */}
                <div ref={langRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setLangOpen((v) => !v)}
                        title={t('lang.label')}
                        aria-label={t('lang.label')}
                        id="lang-toggle-btn"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            height: 38,
                            padding: '0 0.55rem',
                            borderRadius: '50px',
                            border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
                            background: langOpen
                                ? isLight ? 'rgba(79,70,229,0.12)' : 'rgba(99,102,241,0.18)'
                                : isLight ? 'rgba(79,70,229,0.06)' : 'rgba(255,255,255,0.06)',
                            color: isLight ? '#4f46e5' : '#e2e8f0',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                            flexShrink: 0,
                        }}
                    >
                        <Globe size={16} />
                        <span className="hide-mobile" style={{ fontSize: '0.8rem' }}>{currentLang.flag}</span>
                    </button>

                    {langOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                background: isLight ? '#fff' : '#1e293b',
                                border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                overflow: 'hidden',
                                zIndex: 200,
                                minWidth: '140px',
                            }}
                        >
                            {LANGS.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        width: '100%',
                                        padding: '0.65rem 1rem',
                                        background: language === lang.code
                                            ? isLight ? 'rgba(79,70,229,0.1)' : 'rgba(99,102,241,0.2)'
                                            : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: language === lang.code
                                            ? isLight ? '#4f46e5' : '#a5b4fc'
                                            : isLight ? '#374151' : '#cbd5e1',
                                        fontSize: '0.875rem',
                                        fontWeight: language === lang.code ? 700 : 500,
                                        textAlign: 'left',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (language !== lang.code)
                                            (e.currentTarget as HTMLButtonElement).style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (language !== lang.code)
                                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                                    {lang.label}
                                    {language === lang.code && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Theme toggle ───────────────────────────────── */}
                <button
                    onClick={toggleTheme}
                    title={isLight ? t('nav.theme.toDark') : t('nav.theme.toLight')}
                    aria-label={t('lang.label')}
                    id="theme-toggle-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
                        background: isLight ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.06)',
                        color: isLight ? '#4f46e5' : '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.12) rotate(18deg)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = isLight
                            ? '0 2px 12px rgba(79,70,229,0.22)'
                            : '0 2px 12px rgba(255,255,255,0.12)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1) rotate(0deg)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    }}
                >
                    {isLight ? <Moon size={20} strokeWidth={2} /> : <Sun size={20} strokeWidth={2} />}
                </button>

                {/* Logout */}
                <button
                    onClick={() => logout()}
                    className="nav-logout-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.83rem',
                        fontWeight: 600,
                        background: 'transparent',
                        color: settings.navIconColors?.logout || (isLight ? '#dc2626' : '#f43f5e'),
                        border: `1px solid ${isLight ? 'rgba(220,38,38,0.15)' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title={t('nav.logout')}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = isLight
                            ? 'rgba(220,38,38,0.07)'
                            : 'rgba(244,63,94,0.1)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = isLight
                            ? 'rgba(220,38,38,0.25)'
                            : 'rgba(244,63,94,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = isLight
                            ? 'rgba(220,38,38,0.15)'
                            : 'transparent';
                    }}
                >
                    <LogOut size={22} color={settings.navIconColors?.logout || (isLight ? '#dc2626' : '#f43f5e')} /> <span className="hide-mobile">{t('nav.logout')}</span>
                </button>
            </div>
        </nav>
    );
};
