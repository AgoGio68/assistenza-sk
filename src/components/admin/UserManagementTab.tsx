import React from 'react';
import { UserProfile, UserStatus } from '../../types';

interface UserManagementTabProps {
    users: UserProfile[];
    loadingUsers: boolean;
    isSuperadmin: boolean;
    onUpdateStatus: (uid: string, status: UserStatus) => Promise<void>;
    onTogglePermission: (uid: string, currentVal: boolean) => Promise<void>;
    onRemoveUser: (uid: string) => Promise<void>;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
    users,
    loadingUsers,
    isSuperadmin,
    onUpdateStatus,
    onTogglePermission,
    onRemoveUser
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
                        <th>Permessi</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    {loadingUsers ? (
                        <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
                    ) : users.filter(u => u.role !== 'superadmin').map(user => (
                        <tr key={user.uid} style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '0.75rem 0' }}>{user.displayName}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!user.canCreateTickets}
                                        onChange={() => onTogglePermission(user.uid, !!user.canCreateTickets)}
                                        disabled={user.role === 'admin' || user.role === 'superadmin'} // Gli admin possono sempre creare
                                    />
                                    <span style={{ fontSize: '0.8rem' }}>Crea Ticket</span>
                                </div>
                            </td>
                            <td>
                                <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: user.status === 'approved' ? '#dcfce7' : user.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                    color: user.status === 'approved' ? '#166534' : user.status === 'pending' ? '#92400e' : '#991b1b',
                                    fontSize: '0.875rem'
                                }}>
                                    {user.status}
                                </span>
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
