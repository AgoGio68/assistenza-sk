import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, PlusCircle, Settings, LogOut, User, Truck, Ticket } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Navigation: React.FC = () => {
    const { logout, isAdmin, userProfile, userSections } = useAuth();
    const { settings } = useSettings();
    const appName = settings.appName || 'ASSISTENZA SK';

    const navClass = ({ isActive }: { isActive: boolean }) =>
        'nav-link-btn' + (isActive ? ' active' : '');

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.7rem 1.25rem',
            marginBottom: '0.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(5, 10, 22, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 1px 0 rgba(99,102,241,0.12), 0 4px 24px rgba(0,0,0,0.4)',
        }}>
            {/* Left: Brand */}
            <NavLink
                to="/profile"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                title="Il tuo profilo e statistiche"
            >
                <div style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-color), var(--accent-teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: 'var(--glow-indigo)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'white',
                }}>
                    {(userProfile?.displayName || userProfile?.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="nav-brand-name">
                        {userProfile?.displayName || userProfile?.email || appName}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        v{__APP_VERSION__} · {appName}
                    </span>
                </div>
            </NavLink>

            {/* Right: Nav links */}
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <NavLink to="/profile" className={navClass} title="Vedi Profilo e Statistiche">
                    <User size={16} /> <span className="hide-mobile">Profilo</span>
                </NavLink>

                {/* Collegamenti condizionali per le Sezioni */}
                <NavLink to="/" end className={navClass} title="Dashboard Attività">
                    <LayoutDashboard size={16} /> <span className="hide-mobile">Dashboard</span>
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
                        style={({ isActive }) => isActive ? { color: settings.section2Color || 'var(--accent-teal)', borderColor: settings.section2Color || 'var(--accent-teal)' } : {}}
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
                        style={({ isActive }) => isActive ? { color: settings.section2Color || 'var(--accent-teal)', borderColor: settings.section2Color || 'var(--accent-teal)' } : {}}
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

                <button
                    onClick={() => logout()}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.83rem', fontWeight: 500,
                        background: 'transparent',
                        color: 'var(--danger-color)',
                        border: '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Esci dall'applicazione"
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.1)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244,63,94,0.2)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                    }}
                >
                    <LogOut size={16} /> <span className="hide-mobile">Esci</span>
                </button>
            </div>
        </nav>
    );
};
