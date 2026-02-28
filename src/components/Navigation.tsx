import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, Settings, LogOut } from 'lucide-react';

export const Navigation: React.FC = () => {
    const { logout, isAdmin, userProfile, updateDisplayName } = useAuth();
    const appName = import.meta.env.VITE_APP_NAME || 'ASSISTENZA SK';

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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>v1.3.0 - {appName}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <NavLink
                    to="/"
                    style={({ isActive }) => ({ color: isActive ? 'var(--secondary-color)' : 'var(--text-secondary)' })}
                >
                    <Home size={24} />
                </NavLink>

                <NavLink
                    to="/create"
                    style={({ isActive }) => ({ color: isActive ? 'var(--secondary-color)' : 'var(--text-secondary)' })}
                >
                    <PlusCircle size={24} />
                </NavLink>

                {isAdmin && (
                    <NavLink
                        to="/admin"
                        style={({ isActive }) => ({ color: isActive ? 'var(--secondary-color)' : 'var(--text-secondary)' })}
                    >
                        <Settings size={24} />
                    </NavLink>
                )}

                <button
                    onClick={() => logout()}
                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex' }}
                >
                    <LogOut size={24} />
                </button>
            </div>
        </nav>
    );
};
