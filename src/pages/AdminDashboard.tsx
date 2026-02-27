import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Company, Ticket } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Users, Building2, Ticket as TicketIcon } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const { isSuperadmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'tickets'>('tickets');

    // Users state
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Companies state
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [newCompany, setNewCompany] = useState({ name: '', contactName: '', phone: '' });
    const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Company>>({});

    // Tickets state
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchCompanies();
        fetchTickets();
    }, []);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const q = query(collection(db, 'users'));
            const snapshot = await getDocs(q);
            const fetched: UserProfile[] = [];
            snapshot.forEach(doc => fetched.push(doc.data() as UserProfile));
            setUsers(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const q = query(collection(db, 'companies'));
            const snapshot = await getDocs(q);
            const fetched: Company[] = [];
            snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as Company));
            setCompanies(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCompanies(false);
        }
    };

    const fetchTickets = async () => {
        setLoadingTickets(true);
        try {
            const q = query(collection(db, 'tickets'));
            const snapshot = await getDocs(q);
            const fetched: Ticket[] = [];
            snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as Ticket));
            fetched.sort((a, b) => b.createdAt - a.createdAt);
            setTickets(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTickets(false);
        }
    };

    const updateUserStatus = async (uid: string, status: 'pending' | 'approved' | 'rejected') => {
        if (!isSuperadmin) return;
        try {
            await updateDoc(doc(db, 'users', uid), { status });
            setUsers(users.map(u => u.uid === uid ? { ...u, status } : u));
        } catch (err) {
            console.error(err);
        }
    };

    const addCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompany.name.trim()) return;

        try {
            const docRef = doc(collection(db, 'companies'));
            const companyData: Company = {
                name: newCompany.name.trim(),
                contactName: newCompany.contactName.trim(),
                phone: newCompany.phone.trim(),
                lastUsedAt: Date.now()
            };
            await setDoc(docRef, companyData);
            setCompanies([...companies, { id: docRef.id, ...companyData }]);
            setNewCompany({ name: '', contactName: '', phone: '' });
        } catch (err) {
            console.error(err);
        }
    };

    const removeCompany = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'companies', id));
            setCompanies(companies.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const startEditingCompany = (comp: Company) => {
        setEditingCompanyId(comp.id!);
        setEditForm(comp);
    };

    const saveCompanyEdit = async () => {
        if (!editingCompanyId) return;
        try {
            await updateDoc(doc(db, 'companies', editingCompanyId), {
                name: editForm.name,
                contactName: editForm.contactName,
                phone: editForm.phone
            });
            setCompanies(companies.map(c => c.id === editingCompanyId ? { ...c, ...editForm } : c));
            setEditingCompanyId(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Pannello Amministratore</h2>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <button
                    className={`btn ${activeTab === 'tickets' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('tickets')}
                    style={{ flex: 1, minWidth: '120px', backgroundColor: activeTab !== 'tickets' ? 'white' : '', color: activeTab !== 'tickets' ? 'var(--text-primary)' : '' }}
                >
                    <TicketIcon size={20} /> Assistenze
                </button>
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('users')}
                    style={{ flex: 1, minWidth: '120px', backgroundColor: activeTab !== 'users' ? 'white' : '', color: activeTab !== 'users' ? 'var(--text-primary)' : '' }}
                >
                    <Users size={20} /> Utenti
                </button>
                <button
                    className={`btn ${activeTab === 'companies' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('companies')}
                    style={{ flex: 1, minWidth: '120px', backgroundColor: activeTab !== 'companies' ? 'white' : '', color: activeTab !== 'companies' ? 'var(--text-primary)' : '' }}
                >
                    <Building2 size={20} /> Aziende
                </button>
            </div>

            {activeTab === 'tickets' && (
                <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Monitoraggio Globale Assistenze</h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--text-secondary)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 0' }}>Data</th>
                                <th>Azienda</th>
                                <th>Urgenza</th>
                                <th>Stato</th>
                                <th>Assegnato A</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTickets ? (
                                <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
                            ) : tickets.map(ticket => (
                                <tr key={ticket.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                    <td style={{ padding: '0.75rem 0' }}>{new Date(ticket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td style={{ fontWeight: 500 }}>{ticket.companyName}</td>
                                    <td>
                                        <span style={{ color: ticket.urgency === 'urgente' ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 600 }}>
                                            {ticket.urgency.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem',
                                            backgroundColor: ticket.status === 'chiuso' ? '#dcfce7' : ticket.status === 'aperto' ? '#fee2e2' : '#fef3c7',
                                            color: ticket.status === 'chiuso' ? '#166534' : ticket.status === 'aperto' ? '#991b1b' : '#92400e'
                                        }}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {ticket.assignedTo ? (users.find(u => u.uid === ticket.assignedTo)?.displayName || ticket.assignedTo) : '-'}
                                    </td>
                                    <td>
                                        {ticket.status !== 'chiuso' && (
                                            <select
                                                value={ticket.assignedTo || ''}
                                                onChange={async (e) => {
                                                    const newAssigneeId = e.target.value;
                                                    // Se seleziona la prima opzione vuota non fare nulla
                                                    if (!newAssigneeId) return;

                                                    if (window.confirm(`Riassegnare l'assistenza al collega selezionato?`)) {
                                                        try {
                                                            await updateDoc(doc(db, 'tickets', ticket.id!), {
                                                                status: 'preso_in_carico',
                                                                assignedTo: newAssigneeId,
                                                                updatedAt: Date.now()
                                                            });
                                                            fetchTickets();
                                                        } catch (err) { alert('Errore riassegnazione') }
                                                    }
                                                }}
                                                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1', maxWidth: '150px' }}
                                            >
                                                <option value="">Riassegna a...</option>
                                                {/* Mostra come opzioni tutti gli utenti approvati (NON superadmin) */}
                                                {users
                                                    .filter(u => u.status === 'approved' && u.role !== 'superadmin')
                                                    .map(u => (
                                                        <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                                    ))}
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Gestione Utenti (Solo SuperAdmin)</h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--text-secondary)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 0' }}>Nome</th>
                                <th>Email</th>
                                <th>Ruolo</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingUsers ? (
                                <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
                            ) : users.filter(u => u.role !== 'superadmin').map(user => (
                                <tr key={user.uid} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                    <td style={{ padding: '0.75rem 0' }}>{user.displayName}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
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
                                        {isSuperadmin && user.role !== 'superadmin' && (
                                            <select
                                                value={user.status}
                                                onChange={(e) => updateUserStatus(user.uid, e.target.value as any)}
                                                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            >
                                                <option value="pending">In attesa</option>
                                                <option value="approved">Approvato</option>
                                                <option value="rejected">Bloccato</option>
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'companies' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                    {/* Add Company Form */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Aggiungi Nuova Azienda</h3>
                        <form onSubmit={addCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Nome Azienda / Ente"
                                value={newCompany.name}
                                onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                                required
                                style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="text"
                                placeholder="Nome Referente predefinito"
                                value={newCompany.contactName}
                                onChange={e => setNewCompany({ ...newCompany, contactName: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="text"
                                placeholder="Telefono predefinito"
                                value={newCompany.phone}
                                onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
                            />
                            <button type="submit" className="btn btn-primary">Salva Azienda</button>
                        </form>
                    </div>

                    {/* Companies List */}
                    <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Lista Aziende in DB</h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--text-secondary)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem 0' }}>Nome</th>
                                    <th>Referente</th>
                                    <th>Telefono</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingCompanies ? (
                                    <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
                                ) : companies.map(comp => (
                                    <tr key={comp.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                        {editingCompanyId === comp.id ? (
                                            <>
                                                <td style={{ padding: '0.75rem 0' }}>
                                                    <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                </td>
                                                <td>
                                                    <input type="text" value={editForm.contactName || ''} onChange={e => setEditForm({ ...editForm, contactName: e.target.value })} style={{ width: '100%', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                </td>
                                                <td>
                                                    <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={saveCompanyEdit} style={{ background: 'none', border: 'none', color: 'var(--success-color)', cursor: 'pointer', fontWeight: 'bold' }}>Salva</button>
                                                        <button onClick={() => setEditingCompanyId(null)} style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer' }}>Annulla</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>{comp.name}</td>
                                                <td>{comp.contactName}</td>
                                                <td>{comp.phone}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => startEditingCompany(comp)}
                                                            style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                                                        >
                                                            Modifica
                                                        </button>
                                                        <button
                                                            onClick={() => { if (window.confirm('Sicuro di voler eliminare questa azienda?')) removeCompany(comp.id!) }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', textDecoration: 'underline' }}
                                                        >
                                                            Elimina
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
