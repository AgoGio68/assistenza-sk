import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Company, Ticket } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Users, Building2, Ticket as TicketIcon, Settings as SettingsIcon, Download, Search, PieChart } from 'lucide-react';
import { VoiceDictationModal } from '../components/VoiceDictationModal';

export const AdminDashboard: React.FC = () => {
    const { isSuperadmin, currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'tickets' | 'settings'>('tickets');

    // SuperAdmin Global Settings
    const { settings, updateSettings } = useSettings();
    const [localSettings, setLocalSettings] = useState(settings);

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
    const [ticketSortMode, setTicketSortMode] = useState<'chronological' | 'closed_bottom'>('closed_bottom');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // Dictation Modal state for Admins
    const [isDictationModalOpen, setIsDictationModalOpen] = useState(false);
    const [dictationTargetId, setDictationTargetId] = useState<string | null>(null);
    const [dictationInitialText, setDictationInitialText] = useState('');

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterUrgency, setFilterUrgency] = useState('all');
    const [filterCompany, setFilterCompany] = useState('all');

    // Sync local settings when external settings load
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

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

            // Applica ordinamento base al caricamento
            fetched.sort((a, b) => {
                if (ticketSortMode === 'closed_bottom') {
                    if (a.status === 'chiuso' && b.status !== 'chiuso') return 1;
                    if (a.status !== 'chiuso' && b.status === 'chiuso') return -1;

                    // Se entrambi sono aperti, fai prevalere i TUOI ticket e poi l'urgenza
                    if (a.status !== 'chiuso' && b.status !== 'chiuso') {
                        if (currentUser) {
                            const aIsMine = a.assignedTo === currentUser.uid;
                            const bIsMine = b.assignedTo === currentUser.uid;
                            if (aIsMine && !bIsMine) return -1;
                            if (!aIsMine && bIsMine) return 1;
                        }

                        if (a.urgency === 'urgente' && b.urgency !== 'urgente') return -1;
                        if (a.urgency !== 'urgente' && b.urgency === 'urgente') return 1;
                    }
                }
                return b.createdAt - a.createdAt;
            });

            setTickets(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTickets(false);
        }
    };

    // Ricarica quando cambia la modalità di ordinamento
    useEffect(() => {
        fetchTickets();
    }, [ticketSortMode]);

    const formatTimeDiff = (startMs: number, endMs: number) => {
        const diffMs = endMs - startMs;
        if (diffMs < 0) return '-';

        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}g ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
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

    const toggleTicketPermission = async (uid: string, currentVal: boolean = false) => {
        if (!isSuperadmin) return;
        try {
            const newVal = !currentVal;
            await updateDoc(doc(db, 'users', uid), { canCreateTickets: newVal });
            setUsers(users.map(u => u.uid === uid ? { ...u, canCreateTickets: newVal } : u));
        } catch (err) {
            console.error(err);
        }
    };

    const removeUser = async (uid: string) => {
        if (!isSuperadmin) return;
        try {
            await deleteDoc(doc(db, 'users', uid));
            setUsers(users.filter(u => u.uid !== uid));
        } catch (err) {
            console.error(err);
            alert("Errore durante l'eliminazione dell'utente.");
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

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateSettings(localSettings);
            alert("Impostazioni salvate con successo!");
        } catch (error) {
            alert("Errore durante il salvataggio delle impostazioni.");
        }
    };

    const handleSaveDictation = async (newNotes: string) => {
        if (!dictationTargetId) return;

        try {
            const ticketRef = doc(db, 'tickets', dictationTargetId);
            await updateDoc(ticketRef, {
                notes: newNotes,
                updatedAt: Date.now()
            });

            // Aggiorna lo stato locale del ticket selezionato
            if (selectedTicket && selectedTicket.id === dictationTargetId) {
                setSelectedTicket({ ...selectedTicket, notes: newNotes });
            }

            // Aggiorna nella lista
            setTickets(tickets.map(t => t.id === dictationTargetId ? { ...t, notes: newNotes } : t));
        } catch (err) {
            console.error(err);
            alert('Errore salvataggio note');
        } finally {
            setIsDictationModalOpen(false);
            setDictationTargetId(null);
            setDictationInitialText('');
        }
    };

    // Preparazione filtri ticket e logica statistiche
    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.contactName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        const matchesUrgency = filterUrgency === 'all' || t.urgency === filterUrgency;
        const matchesCompany = filterCompany === 'all' || t.companyName === filterCompany;

        return matchesSearch && matchesStatus && matchesUrgency && matchesCompany;
    });

    const openTicketsCount = tickets.filter(t => t.status !== 'chiuso').length;
    const closedTicketsCount = tickets.filter(t => t.status === 'chiuso').length;

    const exportCSV = () => {
        const headers = ['Apertura', 'Chiusura', 'Azienda', 'Referente', 'Urgenza', 'Stato', 'Assegnatario', 'Descrizione', 'Appunti'];
        const csvRows = [headers.join(',')];

        filteredTickets.forEach(t => {
            const row = [
                new Date(t.createdAt).toLocaleString(),
                t.closedAt ? new Date(t.closedAt).toLocaleString() : '',
                `"${t.companyName}"`,
                `"${t.contactName}"`,
                t.urgency,
                t.status,
                t.assignedTo ? users.find(u => u.uid === t.assignedTo)?.displayName || t.assignedTo : '',
                `"${t.description.replace(/"/g, '""')}"`,
                `"${t.notes ? t.notes.replace(/"/g, '""') : ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Tickets_Export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                {isSuperadmin && (
                    <button
                        className={`btn ${activeTab === 'settings' ? 'btn-primary' : ''}`}
                        onClick={() => setActiveTab('settings')}
                        style={{ flex: 1, minWidth: '120px', backgroundColor: activeTab !== 'settings' ? 'white' : '', color: activeTab !== 'settings' ? 'var(--text-primary)' : '' }}
                    >
                        <SettingsIcon size={20} /> Impostazioni
                    </button>
                )}
            </div>

            {activeTab === 'tickets' && (
                <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    {/* Statistiche */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1, padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ color: '#0369a1', margin: 0, fontSize: '0.875rem' }}>Ticket Aperti</h4>
                                <strong style={{ fontSize: '1.5rem', color: '#0284c7' }}>{openTicketsCount}</strong>
                            </div>
                            <PieChart size={32} color="#0284c7" />
                        </div>
                        <div style={{ flex: 1, padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ color: '#166534', margin: 0, fontSize: '0.875rem' }}>Ticket Chiusi</h4>
                                <strong style={{ fontSize: '1.5rem', color: '#15803d' }}>{closedTicketsCount}</strong>
                            </div>
                            <PieChart size={32} color="#15803d" />
                        </div>
                    </div>

                    {/* Filtri e Ricerca */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ricerca Libera</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input type="text" placeholder="Nome, descrizione..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            </div>
                        </div>
                        <div style={{ minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filtra Stato</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                <option value="all">Tutti</option>
                                <option value="aperto">Aperto</option>
                                <option value="preso_in_carico">Preso in carico</option>
                                <option value="chiuso">Chiuso</option>
                            </select>
                        </div>
                        <div style={{ minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filtra Urgenza</label>
                            <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                <option value="all">Tutte</option>
                                <option value="urgente">Urgente</option>
                                <option value="non_urgente">Non Urgente</option>
                            </select>
                        </div>
                        <div style={{ minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filtra Azienda</label>
                            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                <option value="all">Tutte le Aziende</option>
                                {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Lista Ticket ({filteredTickets.length})</h3>
                            <button onClick={exportCSV} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: 'var(--text-primary)' }}>
                                <Download size={16} /> Esporta CSV
                            </button>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Ordina Vista:</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className={`btn ${ticketSortMode === 'chronological' ? 'btn-primary' : ''}`} onClick={() => setTicketSortMode('chronological')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', backgroundColor: ticketSortMode !== 'chronological' ? '#f1f5f9' : '', color: ticketSortMode !== 'chronological' ? 'var(--text-secondary)' : '', border: '1px solid #cbd5e1' }} title="Mostra esattamente in ordine di data di apertura">
                                    Cronologico
                                </button>
                                <button className={`btn ${ticketSortMode === 'closed_bottom' ? 'btn-primary' : ''}`} onClick={() => setTicketSortMode('closed_bottom')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', backgroundColor: ticketSortMode !== 'closed_bottom' ? '#f1f5f9' : '', color: ticketSortMode !== 'closed_bottom' ? 'var(--text-secondary)' : '', border: '1px solid #cbd5e1' }} title="Spingi i ticket già risolti in fondo">
                                    Chiusi in Fondo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', backgroundColor: 'white' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--text-secondary)', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '1rem 0.75rem', minWidth: '150px' }}>Apertura/Chiusura</th>
                                    <th style={{ padding: '1rem 0.75rem' }}>Azienda</th>
                                    <th style={{ padding: '1rem 0.75rem' }}>Urgenza</th>
                                    <th style={{ padding: '1rem 0.75rem' }}>Stato</th>
                                    <th style={{ padding: '1rem 0.75rem' }}>Assegnazione</th>
                                    <th style={{ padding: '1rem 0.75rem' }}>Timing</th>
                                    <th style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>Azioni / Dettagli</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingTickets ? (
                                    <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</td></tr>
                                ) : filteredTickets.map((ticket, index) => (
                                    <tr key={ticket.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem' }}>
                                            <div><strong>Aperto:</strong><br />{new Date(ticket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                                            {ticket.closedAt && (
                                                <div style={{ marginTop: '0.25rem', color: 'var(--success-color)' }}><strong>Chiuso:</strong><br />{new Date(ticket.closedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                                            )}
                                        </td>
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
                                                color: ticket.status === 'chiuso' ? '#166534' : ticket.status === 'aperto' ? '#991b1b' : '#92400e',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {ticket.assignedTo ? (
                                                <>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{users.find(u => u.uid === ticket.assignedTo)?.displayName || ticket.assignedTo}</strong>
                                                    {ticket.status !== 'aperto' && ticket.updatedAt && (
                                                        <div style={{ marginTop: '0.25rem' }}>Preso il {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(ticket.updatedAt).toLocaleDateString()})</div>
                                                    )}
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                            {ticket.status === 'chiuso' && ticket.closedAt ? (
                                                <span style={{ color: '#166534', fontWeight: 500 }}>Chiuso in:<br />{formatTimeDiff(ticket.createdAt, ticket.closedAt)}</span>
                                            ) : (
                                                <span style={{ color: '#92400e', fontWeight: 500 }}>Aperto da:<br />{formatTimeDiff(ticket.createdAt, Date.now())}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 0.75rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                >
                                                    Guarda Dettagli
                                                </button>
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
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Dettagli Ticket per Admin */}
            {
                selectedTicket && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000,
                        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                    }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', backgroundColor: 'white' }}>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.5rem', fontWeight: 'bold' }}
                            >
                                &times;
                            </button>

                            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Dettagli Assistenza: {selectedTicket.companyName}</h3>

                            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Riferimento:</strong>
                                    <div>{selectedTicket.contactName} - {selectedTicket.phone}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Stato attuale:</strong>
                                    <div><span style={{ fontWeight: 600, color: selectedTicket.status === 'chiuso' ? 'var(--success-color)' : 'var(--danger-color)' }}>{selectedTicket.status.toUpperCase()}</span></div>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Descrizione Originale del Problema:</strong>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</div>

                                    {selectedTicket.photoUrls && selectedTicket.photoUrls.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                            <strong style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>FOTO ALLEGATE:</strong>
                                            {selectedTicket.photoUrls.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer" title="Clicca per ingrandire" style={{ display: 'block', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                                    <img src={url} alt={`Allegato ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedTicket.notes && (
                                    <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                        <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.5rem' }}>Appunti / Note di Chiusura:</strong>
                                        <div style={{ whiteSpace: 'pre-wrap', color: '#92400e' }}>{selectedTicket.notes}</div>
                                    </div>
                                )}

                                {!selectedTicket.notes && selectedTicket.status === 'chiuso' && (
                                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Nessuna nota finale inserita.</div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <button
                                    onClick={() => {
                                        setDictationTargetId(selectedTicket.id!);
                                        setDictationInitialText(selectedTicket.notes || '');
                                        setIsDictationModalOpen(true);
                                    }}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    Modifica Appunti
                                </button>
                                <button onClick={() => setSelectedTicket(null)} className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0', color: 'var(--text-primary)' }}>
                                    Chiudi Finestra
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <VoiceDictationModal
                isOpen={isDictationModalOpen}
                onClose={() => setIsDictationModalOpen(false)}
                onSave={handleSaveDictation}
                initialText={dictationInitialText}
                title="Modifica Note Intervento (Admin)"
            />

            {
                activeTab === 'users' && (
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
                                    <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
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
                                                    onChange={() => toggleTicketPermission(user.uid, user.canCreateTickets)}
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
                                                        onChange={(e) => updateUserStatus(user.uid, e.target.value as any)}
                                                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    >
                                                        <option value="pending">In attesa</option>
                                                        <option value="approved">Approvato</option>
                                                        <option value="rejected">Bloccato</option>
                                                    </select>
                                                )}
                                                {isSuperadmin && user.role !== 'superadmin' && (
                                                    <button
                                                        onClick={() => { if (window.confirm(`Sei sicuro di voler ELIMINARE DEFINITIVAMENTE l'utente ${user.displayName || user.email}?`)) removeUser(user.uid) }}
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
                )
            }

            {
                activeTab === 'companies' && (
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

            {activeTab === 'settings' && isSuperadmin && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Impostazioni Grafica e Brand</h3>
                    <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nome Applicazione</label>
                            <input type="text" value={localSettings.appName || ''} onChange={e => setLocalSettings(prev => ({ ...prev, appName: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Colore Primario App (Barra superiore, headers)</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input type="color" value={localSettings.primaryColor || '#0f172a'} onChange={e => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))} style={{ width: '50px', height: '50px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                                <span>{localSettings.primaryColor || '#0f172a'}</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Colore Secondario (Pulsanti primari e testi evidenziati)</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input type="color" value={localSettings.secondaryColor || '#3b82f6'} onChange={e => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))} style={{ width: '50px', height: '50px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                                <span>{localSettings.secondaryColor || '#3b82f6'}</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>URL Logo Identificativo (Opzionale)</label>
                            <input type="url" placeholder="https://es. immagine.png" value={localSettings.logoUrl || ''} onChange={e => setLocalSettings(prev => ({ ...prev, logoUrl: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Lascia vuoto per usare il logo di default interno all'applicazione.</p>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                        <h4 style={{ marginBottom: '1rem' }}>Preferenze Visibilità e Permessi</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visibilità Ticket per Utenti Non-Admin</label>
                                <select
                                    value={localSettings.visibilityMode}
                                    onChange={e => setLocalSettings(prev => ({ ...prev, visibilityMode: e.target.value as any }))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="all">Vedi tutti i ticket (Open/In Carico)</option>
                                    <option value="assigned_only">Vedi solo i ticket assegnati a me</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Modalità Visualizzazione Ticket (PC/Tablet)</label>
                                <select
                                    value={localSettings.layoutMode}
                                    onChange={e => setLocalSettings(prev => ({ ...prev, layoutMode: e.target.value as any }))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="default">Lista Estesa (Standard)</option>
                                    <option value="compact">Griglia Compatta (Riquadri cliccabili)</option>
                                </select>
                            </div>

                            {localSettings.layoutMode === 'compact' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="applyCompactToAll"
                                        checked={localSettings.applyCompactToAll}
                                        onChange={e => setLocalSettings(prev => ({ ...prev, applyCompactToAll: e.target.checked }))}
                                    />
                                    <label htmlFor="applyCompactToAll" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Applica vista compatta anche agli utenti (non solo Admin)</label>
                                </div>
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                        <h4 style={{ marginBottom: '1rem', color: '#0369a1' }}>Funzionalità Extra: Caricamento Fotografie</h4>
                        <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    type="checkbox"
                                    id="enablePhotos"
                                    checked={localSettings.enablePhotos || false}
                                    onChange={e => setLocalSettings(prev => ({ ...prev, enablePhotos: e.target.checked }))}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                                <label htmlFor="enablePhotos" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0369a1', cursor: 'pointer' }}>
                                    Abilita l'upload di fotografie nei ticket
                                </label>
                            </div>

                            {localSettings.enablePhotos && (
                                <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                                    <strong style={{ display: 'block', color: '#b91c1c', marginBottom: '0.5rem' }}>⚠️ ATTENZIONE: Costi Firebase Storage</strong>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d' }}>
                                        Hai attivato il caricamento delle immagini. Firebase offre <strong>5 GB di spazio di archiviazione gratuito</strong> (Piano Spark).
                                        Superata questa soglia, se non si passa a un piano a pagamento (Blaze), il caricamento verrà bloccato da Firebase.
                                        <br /><br />
                                        <em>Nota: Le immagini vengono compresse automaticamente in formato webP/JPEG ridotto prima dell'invio per massimizzare la resa dei 5 GB.</em>
                                    </p>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1.5rem' }}>
                            <SettingsIcon size={18} /> Salva e Applica Globalmente
                        </button>
                    </form>
                </div>
            )
            }
        </div>
    );
};
