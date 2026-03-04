import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, Settings, LogOut, User, Truck } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Navigation: React.FC = () => {
    const { logout, isAdmin, userProfile } = useAuth();
    const { settings } = useSettings();
    const appName = settings.appName || 'ASSISTENZA SK';

    return (
        <nav className="glass-panel" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            marginBottom: '1rem',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            borderRadius: '0 0 var(--border-radius-lg) var(--border-radius-lg)',
            borderTop: 'none'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <NavLink
                    to="/profile"
                    style={{ textDecoration: 'none', textAlign: 'left' }}
                    title="Il tuo profilo e statistiche"
                >
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)', display: 'block' }}>
                        {userProfile?.displayName || userProfile?.email || appName}
                    </span>
                </NavLink>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>v1.9.2 - {appName}</span>

            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <NavLink
                    to="/profile"
                    className="btn"
                    style={({ isActive }) => ({ padding: '0.5rem 0.75rem', backgroundColor: isActive ? 'var(--secondary-color)' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' })}
                    title="Vedi Profilo e Statistiche"
                >
                    <User size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Profilo</span>
                </NavLink>

                <NavLink
                    to="/"
                    className="btn"
                    style={({ isActive }) => ({ padding: '0.5rem 0.75rem', backgroundColor: isActive ? 'var(--secondary-color)' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' })}
                    title="Torna alla Home"
                >
                    <Home size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Home</span>
                </NavLink>

                {(settings.enableInstallations || isAdmin) && (
                    <NavLink
                        to="/installations"
                        className="btn"
                        style={({ isActive }) => ({ padding: '0.5rem 0.75rem', backgroundColor: isActive ? 'var(--secondary-color)' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' })}
                        title="Gestione Installazioni Macchine"
                    >
                        <Truck size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Installazioni</span>
                    </NavLink>
                )}

                {(isAdmin || settings.allowUserTicketCreation) && (
                    <NavLink
                        to="/create"
                        className="btn"
                        style={({ isActive }) => ({ padding: '0.5rem 0.75rem', backgroundColor: isActive ? 'var(--secondary-color)' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' })}
                        title="Apri un nuovo Ticket di Assistenza"
                    >
                        <PlusCircle size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Nuova Assistenza</span>
                    </NavLink>
                )}

                {isAdmin && (
                    <NavLink
                        to="/admin"
                        className="btn"
                        style={({ isActive }) => ({ padding: '0.5rem 0.75rem', backgroundColor: isActive ? 'var(--secondary-color)' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' })}
                        title="Gestione globale Amministratori"
                    >
                        <Settings size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Pannello Admin</span>
                    </NavLink>
                )}

                <button
                    onClick={() => logout()}
                    className="btn"
                    style={{ padding: '0.5rem 0.75rem', background: 'transparent', color: 'var(--danger-color)' }}
                    title="Esci dall'applicazione"
                >
                    <LogOut size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Esci</span>
                </button>
            </div>
        </nav>
    );
};
