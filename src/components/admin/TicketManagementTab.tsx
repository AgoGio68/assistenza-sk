import { Ticket, Company, UserProfile } from '../../types';
import { Download, Search, PieChart } from 'lucide-react';
import { getCreatorName, getAssigneeName } from '../../utils/nameUtils';

interface TicketManagementTabProps {
    tickets: Ticket[];
    filteredTickets: Ticket[];
    loadingTickets: boolean;
    openTicketsCount: number;
    closedTicketsCount: number;
    totalDurationHours: number;
    totalDurationMinutes: number;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterStatus: string;
    setFilterStatus: (val: string) => void;
    filterUrgency: string;
    setFilterUrgency: (val: string) => void;
    filterCompany: string;
    setFilterCompany: (val: string) => void;
    companies: Company[];
    onExportCSV: () => void;
    deleteMonthStr: string;
    setDeleteMonthStr: (val: string) => void;
    onDeleteTicketsByMonth: () => Promise<void>;
    ticketSortMode: 'chronological' | 'closed_bottom';
    setTicketSortMode: (val: 'chronological' | 'closed_bottom') => void;
    onShowDetails: (ticket: Ticket) => void;
    onReassign: (ticket: Ticket, newAssigneeId: string) => Promise<void>;
    users: UserProfile[];
    formatTimeDiff: (startMs: number, endMs: number) => string;
}

export const TicketManagementTab: React.FC<TicketManagementTabProps> = ({
    filteredTickets,
    loadingTickets,
    openTicketsCount,
    closedTicketsCount,
    totalDurationHours,
    totalDurationMinutes,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterUrgency,
    setFilterUrgency,
    filterCompany,
    setFilterCompany,
    companies,
    onExportCSV,
    deleteMonthStr,
    setDeleteMonthStr,
    onDeleteTicketsByMonth,
    ticketSortMode,
    setTicketSortMode,
    onShowDetails,
    onReassign,
    users,
    formatTimeDiff
}) => {
    return (
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
                <div style={{ flex: 1, padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ color: '#92400e', margin: 0, fontSize: '0.875rem' }}>Tempo Totale</h4>
                        <strong style={{ fontSize: '1.5rem', color: '#b45309' }}>{totalDurationHours}h {totalDurationMinutes}m</strong>
                    </div>
                    <PieChart size={32} color="#b45309" />
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
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={onExportCSV} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: 'var(--text-primary)' }}>
                            <Download size={16} /> Esporta CSV
                        </button>

                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', backgroundColor: '#fee2e2', padding: '0.25rem', borderRadius: '4px', border: '1px solid #fca5a5' }} title="Elimina tutti i ticket di un mese specifico">
                            <input
                                type="month"
                                value={deleteMonthStr}
                                onChange={e => setDeleteMonthStr(e.target.value)}
                                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #f87171', fontSize: '0.8rem', backgroundColor: 'white' }}
                            />
                            <button
                                onClick={onDeleteTicketsByMonth}
                                disabled={!deleteMonthStr}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: deleteMonthStr ? 'var(--danger-color)' : '#fca5a5', color: 'white', borderRadius: '4px', border: 'none', cursor: deleteMonthStr ? 'pointer' : 'not-allowed' }}
                            >
                                Elimina Mese
                            </button>
                        </div>
                    </div>
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
                            <th style={{ padding: '1rem 0.75rem' }}>Aperto da</th>
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
                                <td style={{ fontSize: '0.875rem' }}>
                                    <strong>{getCreatorName(ticket, users)}</strong>
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
                                    <strong style={{ color: 'var(--text-primary)' }}>{getAssigneeName(ticket, users)}</strong>
                                    {ticket.status !== 'aperto' && ticket.updatedAt && (
                                        <div style={{ marginTop: '0.25rem' }}>Preso il {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    )}
                                </td>
                                <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                    {ticket.status === 'chiuso' && (
                                        <div style={{ color: '#166534', fontWeight: 500 }}>
                                            <div>Chiuso in: {formatTimeDiff(ticket.createdAt, ticket.closedAt || Date.now())}</div>
                                            {(ticket.durationHours !== undefined || ticket.durationMinutes !== undefined) && (
                                                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', backgroundColor: '#dcfce7', padding: '0.1rem 0.3rem', borderRadius: '4px', display: 'inline-block' }}>
                                                    Durata: {ticket.durationHours || 0}h {ticket.durationMinutes || 0}m
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {ticket.status !== 'chiuso' && (
                                        <span style={{ color: '#92400e', fontWeight: 500 }}>Aperto da:<br />{formatTimeDiff(ticket.createdAt, Date.now())}</span>
                                    )}
                                </td>
                                <td style={{ padding: '1rem 0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => onShowDetails(ticket)}
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
                                                    if (!newAssigneeId) return;
                                                    onReassign(ticket, newAssigneeId);
                                                }}
                                                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1', maxWidth: '150px' }}
                                            >
                                                <option value="">Riassegna a...</option>
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
    );
};
