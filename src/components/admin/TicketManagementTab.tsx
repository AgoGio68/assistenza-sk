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
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            {/* Statistiche */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, padding: '1rem', background: 'rgba(56,189,248,0.08)', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ color: 'var(--info-color)', margin: 0, fontSize: '0.875rem' }}>Ticket Aperti</h4>
                        <strong style={{ fontSize: '1.5rem', color: 'var(--info-color)' }}>{openTicketsCount}</strong>
                    </div>
                    <PieChart size={32} color="var(--info-color)" />
                </div>
                <div style={{ flex: 1, padding: '1rem', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ color: 'var(--success-color)', margin: 0, fontSize: '0.875rem' }}>Ticket Chiusi</h4>
                        <strong style={{ fontSize: '1.5rem', color: 'var(--success-color)' }}>{closedTicketsCount}</strong>
                    </div>
                    <PieChart size={32} color="var(--success-color)" />
                </div>
                <div style={{ flex: 1, padding: '1rem', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ color: 'var(--warning-color)', margin: 0, fontSize: '0.875rem' }}>Tempo Totale</h4>
                        <strong style={{ fontSize: '1.5rem', color: 'var(--warning-color)' }}>{totalDurationHours}h {totalDurationMinutes}m</strong>
                    </div>
                    <PieChart size={32} color="var(--warning-color)" />
                </div>
            </div>

            {/* Filtri e Ricerca */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-subtle)' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Lista Ticket ({filteredTickets.length})</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={onExportCSV} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                            <Download size={16} /> Esporta CSV
                        </button>

                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', background: 'rgba(244,63,94,0.08)', padding: '0.25rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(244,63,94,0.2)' }} title="Elimina tutti i ticket di un mese specifico">
                            <input
                                type="month"
                                value={deleteMonthStr}
                                onChange={e => setDeleteMonthStr(e.target.value)}
                                style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            />
                            <button
                                onClick={onDeleteTicketsByMonth}
                                disabled={!deleteMonthStr}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', opacity: deleteMonthStr ? 1 : 0.4, cursor: deleteMonthStr ? 'pointer' : 'not-allowed' }}
                            >
                                Elimina Mese
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordina Vista:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={`btn ${ticketSortMode === 'chronological' ? 'btn-primary' : ''}`} onClick={() => setTicketSortMode('chronological')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} title="Mostra esattamente in ordine di data di apertura">
                            Cronologico
                        </button>
                        <button className={`btn ${ticketSortMode === 'closed_bottom' ? 'btn-primary' : ''}`} onClick={() => setTicketSortMode('closed_bottom')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} title="Spingi i ticket già risolti in fondo">
                            Chiusi in Fondo
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-elevated)' }}>
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
                            <tr key={ticket.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'} onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}>
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
                                    <span className={`status-badge ${ticket.status === 'chiuso' ? 'chiuso' : ticket.status === 'aperto' ? 'aperto' : 'in-carico'}`}>
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
                                        <div style={{ color: 'var(--success-color)', fontWeight: 500 }}>
                                            <div>Chiuso in: {formatTimeDiff(ticket.createdAt, ticket.closedAt || Date.now())}</div>
                                            {(ticket.durationHours !== undefined || ticket.durationMinutes !== undefined) && (
                                                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.12)', color: 'var(--success-color)', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'inline-block', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    Durata: {ticket.durationHours || 0}h {ticket.durationMinutes || 0}m
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {ticket.status !== 'chiuso' && (
                                        <span style={{ color: 'var(--warning-color)', fontWeight: 500 }}>Aperto da:<br />{formatTimeDiff(ticket.createdAt, Date.now())}</span>
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
