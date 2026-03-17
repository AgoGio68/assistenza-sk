import React from 'react';
import { UserProfile, UserStatus } from '../../types';

interface UserManagementTabProps {
    users: UserProfile[];
    loadingUsers: boolean;
    isSuperadmin: boolean;
    onUpdateStatus: (uid: string, status: UserStatus) => Promise<void>;
    onTogglePermission: (uid: string, currentVal: boolean) => Promise<void>;
    onUpdateSections: (uid: string, currentSections: ('sk'|'s2')[], toggleSection: 'sk'|'s2') => Promise<void>;
    onRemoveUser: (uid: string) => Promise<void>;
    localSettings: any;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
    users,
    loadingUsers,
    isSuperadmin,
    onUpdateStatus,
    onTogglePermission,
    onUpdateSections,
    onRemoveUser,
    localSettings
}) => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Gestione Utenti (Solo SuperAdmin)</h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 0' }}>Nome</th>
                        <th>Email</th>
                        <th>Ruolo</th>
                        <th>Permessi/Stato</th>
                        <th>Sezioni (App)</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    {loadingUsers ? (
                        <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
                    ) : users.filter(u => u.role !== 'superadmin').map(user => (
                        <tr key={user.uid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.75rem 0' }}>{user.displayName}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!user.canCreateTickets}
                                            onChange={() => onTogglePermission(user.uid, !!user.canCreateTickets)}
                                            disabled={user.role === 'admin' || user.role === 'superadmin'} // Gli admin possono sempre creare
                                        />
                                        <span style={{ fontSize: '0.8rem' }}>Crea Ticket</span>
                                    </div>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.2rem 0.4rem',
                                        borderRadius: '4px',
                                        background: user.status === 'approved' ? 'rgba(16,185,129,0.12)' : user.status === 'pending' ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.12)',
                                        color: user.status === 'approved' ? 'var(--success-color)' : user.status === 'pending' ? 'var(--warning-color)' : 'var(--danger-color)',
                                        border: `1px solid ${user.status === 'approved' ? 'rgba(16,185,129,0.25)' : user.status === 'pending' ? 'rgba(245,158,11,0.25)' : 'rgba(244,63,94,0.25)'}`,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        width: 'max-content'
                                    }}>
                                        {user.status.toUpperCase()}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={user.sections?.includes('sk') ?? true}
                                            onChange={() => onUpdateSections(user.uid, user.sections || ['sk'], 'sk')}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Assistenza SK</span>
                                    </div>
                                    {localSettings.section2Enabled && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={user.sections?.includes('s2') || false}
                                                onChange={() => onUpdateSections(user.uid, user.sections || ['sk'], 's2')}
                                            />
                                            <span style={{ fontSize: '0.8rem', color: localSettings.section2Color || 'var(--accent-teal)', fontWeight: 600 }}>
                                                {localSettings.section2Name || 'Sezione 2'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {isSuperadmin && user.role !== 'superadmin' && (
                                        <select
                                            value={user.status}
                                            onChange={(e) => onUpdateStatus(user.uid, e.target.value as any)}
                                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="pending">In attesa</option>
                                            <option value="approved">Approvato</option>
                                            <option value="rejected">Bloccato</option>
                                        </select>
                                    )}
                                    {isSuperadmin && user.role !== 'superadmin' && (
                                        <button
                                            onClick={() => { if (window.confirm(`Sei sicuro di voler ELIMINARE DEFINITIVAMENTE l'utente ${user.displayName || user.email}?`)) onRemoveUser(user.uid) }}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
                                        >
                                            Elimina
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
