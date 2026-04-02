import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, PlusCircle, Settings, LogOut, User, Truck, Ticket, Calendar, Sun, Moon } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

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

export const Navigation: React.FC = () => {
    const { logout, isAdmin, userProfile, userSections } = useAuth();
    const { settings } = useSettings();
    const appName = settings.appName || 'ASSISTENZA SK';

    const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    const isLight = theme === 'light';

    const navClass = ({ isActive }: { isActive: boolean }) => 'nav-link-btn' + (isActive ? ' active' : '');

    return (
        <nav
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.7rem 1.25rem',
                marginBottom: '0.75rem',
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
                transition: 'background 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease',
            }}
        >
            {/* Left: Brand */}
            <NavLink
                to="/profile"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                title="Il tuo profilo e statistiche"
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                    gap: '0.3rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                }}
            >
                <NavLink to="/profile" className={navClass} title="Vedi Profilo e Statistiche">
                    <User size={16} /> <span className="hide-mobile">Profilo</span>
                </NavLink>

                <NavLink to="/" end className={navClass} title="Dashboard Attività">
                    <LayoutDashboard size={16} /> <span className="hide-mobile">Dashboard</span>
                </NavLink>

                <NavLink to="/calendar" className={navClass} title="Calendario Attività">
                    <Calendar size={16} /> <span className="hide-mobile">Calendario</span>
                </NavLink>

                {userSections.includes('sk') && (
                    <NavLink to="/tickets" className={navClass} title="Ticket Assistenza SK">
                        <Ticket rotate={-90} size={16} /> <span className="hide-mobile">Assistenze SK</span>
                    </NavLink>
                )}

                {settings.section2Enabled && userSections.includes('s2') && (
                    <NavLink
                        to="/s2"
                        className={navClass}
                        title={`Ticket ${settings.section2Name || 'Sezione 2'}`}
                        style={({ isActive }) =>
                            isActive
                                ? {
                                      color: settings.section2Color || 'var(--accent-teal)',
                                      borderColor: settings.section2Color || 'var(--accent-teal)',
                                  }
                                : {}
                        }
                    >
                        <Ticket size={16} /> <span className="hide-mobile">{settings.section2Name || 'Sezione 2'}</span>
                    </NavLink>
                )}

                {(settings.enableInstallations || isAdmin) && (
                    <NavLink to="/installations" className={navClass} title="Gestione Installazioni Macchine">
                        <Truck size={16} /> <span className="hide-mobile">Installazioni</span>
                    </NavLink>
                )}

                {settings.section2Enabled && settings.section2InstallationsEnabled && userSections.includes('s2') && (
                    <NavLink
                        to="/s2/installations"
                        className={navClass}
                        title={`Installazioni ${settings.section2Name || 'Sezione 2'}`}
                        style={({ isActive }) =>
                            isActive
                                ? {
                                      color: settings.section2Color || 'var(--accent-teal)',
                                      borderColor: settings.section2Color || 'var(--accent-teal)',
                                  }
                                : {}
                        }
                    >
                        <Truck size={16} /> <span className="hide-mobile">Inst. {settings.section2Name || 'S2'}</span>
                    </NavLink>
                )}

                {(isAdmin || settings.allowUserTicketCreation) && (
                    <NavLink to="/create" className={navClass} title="Apri un nuovo Ticket di Assistenza">
                        <PlusCircle size={16} /> <span className="hide-mobile">Nuova Assistenza</span>
                    </NavLink>
                )}

                {isAdmin && (
                    <NavLink to="/admin" className={navClass} title="Gestione globale Amministratori">
                        <Settings size={16} /> <span className="hide-mobile">Pannello Admin</span>
                    </NavLink>
                )}

                {/* ─── Theme toggle ───────────────────────────────── */}
                <button
                    onClick={toggleTheme}
                    title={isLight ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
                    aria-label="Cambia tema"
                    id="theme-toggle-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 34,
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
                    {isLight ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
                </button>

                {/* Logout */}
                <button
                    onClick={() => logout()}
                    className="nav-logout-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.83rem',
                        fontWeight: 600,
                        background: 'transparent',
                        color: isLight ? '#dc2626' : '#f43f5e',
                        border: `1px solid ${isLight ? 'rgba(220,38,38,0.15)' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Esci dall'applicazione"
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
                    <LogOut size={16} /> <span className="hide-mobile">Esci</span>
                </button>
            </div>
        </nav>
    );
};
