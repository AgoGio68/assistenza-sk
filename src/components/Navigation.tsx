import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, Settings, LogOut } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Navigation: React.FC = () => {
    const { logout, isAdmin, userProfile, updateDisplayName } = useAuth();
    const { settings } = useSettings();
    const appName = settings.appName || 'ASSISTENZA SK';

    const handleNameChange = async () => {
        const newName = window.prompt("Come vuoi essere chiamato?", userProfile?.displayName || '');
        if (newName && newName.trim() !== '') {
            await updateDisplayName(newName.trim());
        }
    };

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
                <button
                    onClick={handleNameChange}
                    style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                    title="Clicca per cambiare il tuo nome"
                >
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                        {userProfile?.displayName || userProfile?.email || appName}
                    </span>
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>v1.5.1 - {appName}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <NavLink
                    to="/"
                    className="btn"
                    style={({ isActive }) => ({ padding: '0.5rem 0.75rem', backgroundColor: isActive ? 'var(--secondary-color)' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' })}
                    title="Torna alla Home"
                >
                    <Home size={20} /> <span className="hide-mobile" style={{ fontSize: '0.85rem' }}>Home</span>
                </NavLink>

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
