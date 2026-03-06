import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Company, Ticket } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Users, Building2, Ticket as TicketIcon, Settings as SettingsIcon } from 'lucide-react';
import { VoiceDictationModal } from '../components/VoiceDictationModal';

// New Tab Components
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { CompanyManagementTab } from '../components/admin/CompanyManagementTab';
import { TicketManagementTab } from '../components/admin/TicketManagementTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { AdminTicketDetailsModal } from '../components/admin/AdminTicketDetailsModal';

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

    // Deletion states
    const [deleteMonthStr, setDeleteMonthStr] = useState<string>('');

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
            snapshot.forEach(doc => fetched.push({ ...doc.data() as UserProfile, uid: doc.id }));
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
        const headers = ['APERTURA', 'CHIUSURA', 'AZIENDA', 'REFERENTE', 'URGENZA', 'STATO', 'ASSEGNATARIO', 'CHIUSO DA', 'DURATA', 'DESCRIZIONE', 'APPUNTI'];
        const csvRows = [headers.join(',')];

        filteredTickets.forEach(t => {
            const h = t.durationHours || 0;
            const m = t.durationMinutes || 0;
            const durationStr = `${h}:${m < 10 ? '0' + m : m}`;

            const assignee = t.assignedTo ? users.find(u => u.uid === t.assignedTo)?.displayName || 'COLLEGA (RIMOSSO)' : '';
            const closer = t.closedBy ? users.find(u => u.uid === t.closedBy)?.displayName || 'COLLEGA (RIMOSSO)' : '';

            const row = [
                `"${new Date(t.createdAt).toLocaleString().toUpperCase()}"`,
                t.closedAt ? `"${new Date(t.closedAt).toLocaleString().toUpperCase()}"` : '',
                `"${t.companyName.toUpperCase()}"`,
                `"${(t.contactName || '').toUpperCase()}"`,
                t.urgency.toUpperCase(),
                t.status.toUpperCase(),
                `"${assignee.toUpperCase()}"`,
                `"${closer.toUpperCase()}"`,
                `"${durationStr}"`,
                `"${t.description.replace(/"/g, '""').toUpperCase()}"`,
                `"${t.notes ? t.notes.replace(/"/g, '""').toUpperCase() : ''}"`
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

    const deleteTicket = async (ticketId: string) => {
        if (!window.confirm('Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo ticket? L\'azione è irreversibile.')) return;
        try {
            await deleteDoc(doc(db, 'tickets', ticketId));
            setTickets(tickets.filter(t => t.id !== ticketId));
            if (selectedTicket?.id === ticketId) setSelectedTicket(null);
        } catch (err) {
            console.error(err);
            alert("Errore durante l'eliminazione del ticket.");
        }
    };

    const deleteTicketsByMonth = async () => {
        if (!deleteMonthStr) return;
        const [yearStr, monthStr] = deleteMonthStr.split('-');
        if (!yearStr || !monthStr) return;

        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // 0-indexed in JS date

        const startOfMonth = new Date(year, month, 1).getTime();
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

        const ticketsToDelete = tickets.filter(t => t.createdAt >= startOfMonth && t.createdAt <= endOfMonth);

        if (ticketsToDelete.length === 0) {
            alert('Nessun ticket trovato in questo mese.');
            return;
        }

        if (!window.confirm(`Stai per eliminare ${ticketsToDelete.length} ticket creati nel mese selezionato. Sei veramente sicuro? L'operazione NON è reversibile.`)) return;

        try {
            // Eliminiamo tutti i ticket di quel periodo
            const deletePromises = ticketsToDelete.map(t => deleteDoc(doc(db, 'tickets', t.id!)));
            await Promise.all(deletePromises);

            setTickets(tickets.filter(t => !(t.createdAt >= startOfMonth && t.createdAt <= endOfMonth)));
            alert(`${ticketsToDelete.length} ticket eliminati con successo.`);
            setDeleteMonthStr('');
        } catch (err) {
            console.error(err);
            alert("Errore durante l'eliminazione massiva dei ticket.");
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Pannello Amministratore</h2>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <button
                    className={`btn ${activeTab === 'tickets' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('tickets')}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    <TicketIcon size={20} /> Assistenze
                </button>
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('users')}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    <Users size={20} /> Utenti
                </button>
                <button
                    className={`btn ${activeTab === 'companies' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('companies')}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    <Building2 size={20} /> Aziende
                </button>
                {isSuperadmin && (
                    <button
                        className={`btn ${activeTab === 'settings' ? 'btn-primary' : ''}`}
                        onClick={() => setActiveTab('settings')}
                        style={{ flex: 1, minWidth: '120px' }}
                    >
                        <SettingsIcon size={20} /> Impostazioni
                    </button>
                )}
            </div>

            {activeTab === 'tickets' && (
                <TicketManagementTab
                    tickets={tickets}
                    filteredTickets={filteredTickets}
                    loadingTickets={loadingTickets}
                    openTicketsCount={openTicketsCount}
                    closedTicketsCount={closedTicketsCount}
                    totalDurationHours={filteredTickets.reduce((acc, t) => acc + (t.durationHours || 0), 0) + Math.floor(filteredTickets.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) / 60)}
                    totalDurationMinutes={filteredTickets.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) % 60}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterUrgency={filterUrgency}
                    setFilterUrgency={setFilterUrgency}
                    filterCompany={filterCompany}
                    setFilterCompany={setFilterCompany}
                    companies={companies}
                    onExportCSV={exportCSV}
                    deleteMonthStr={deleteMonthStr}
                    setDeleteMonthStr={setDeleteMonthStr}
                    onDeleteTicketsByMonth={deleteTicketsByMonth}
                    ticketSortMode={ticketSortMode}
                    setTicketSortMode={setTicketSortMode}
                    onShowDetails={setSelectedTicket}
                    onReassign={async (ticket, newAssigneeId) => {
                        const ticketRef = doc(db, 'tickets', ticket.id!);
                        await updateDoc(ticketRef, {
                            assignedTo: newAssigneeId,
                            status: 'preso_in_carico',
                            updatedAt: Date.now()
                        });
                        fetchTickets();
                    }}
                    users={users}
                    formatTimeDiff={formatTimeDiff}
                />
            )}

            {activeTab === 'users' && isSuperadmin && (
                <UserManagementTab
                    users={users}
                    loadingUsers={loadingUsers}
                    isSuperadmin={isSuperadmin}
                    onUpdateStatus={updateUserStatus}
                    onTogglePermission={toggleTicketPermission}
                    onRemoveUser={removeUser}
                />
            )}

            {activeTab === 'companies' && (
                <CompanyManagementTab
                    companies={companies}
                    loadingCompanies={loadingCompanies}
                    newCompany={newCompany}
                    setNewCompany={setNewCompany}
                    editingCompanyId={editingCompanyId}
                    setEditingCompanyId={setEditingCompanyId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onAddCompany={addCompany}
                    onRemoveCompany={removeCompany}
                    onStartEditing={startEditingCompany}
                    onSaveEdit={saveCompanyEdit}
                />
            )}

            {activeTab === 'settings' && isSuperadmin && (
                <SettingsTab
                    localSettings={localSettings}
                    setLocalSettings={setLocalSettings}
                    onSaveSettings={handleSaveSettings}
                />
            )}

            {/* Ticket Details Modal */}
            {selectedTicket && (
                <AdminTicketDetailsModal
                    selectedTicket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onEditNotes={(t) => {
                        setDictationTargetId(t.id!);
                        setDictationInitialText(t.notes || '');
                        setIsDictationModalOpen(true);
                    }}
                    onDeleteTicket={deleteTicket}
                    users={users}
                />
            )}

            {/* Dictation Modal for updating notes */}
            {isDictationModalOpen && (
                <VoiceDictationModal
                    isOpen={isDictationModalOpen}
                    onClose={() => setIsDictationModalOpen(false)}
                    onSave={handleSaveDictation}
                    initialText={dictationInitialText}
                />
            )}
        </div>
    );
};
