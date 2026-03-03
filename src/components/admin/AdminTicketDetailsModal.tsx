import { Ticket, UserProfile } from '../../types';
import { getCreatorName, getAssigneeName, getClosedByName } from '../../utils/nameUtils';

interface AdminTicketDetailsModalProps {
    selectedTicket: Ticket;
    onClose: () => void;
    onEditNotes: (ticket: Ticket) => void;
    onDeleteTicket: (ticketId: string) => Promise<void>;
    users: UserProfile[];
}

export const AdminTicketDetailsModal: React.FC<AdminTicketDetailsModalProps> = ({
    selectedTicket,
    onClose,
    onEditNotes,
    onDeleteTicket,
    users
}) => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', backgroundColor: 'white' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.5rem', fontWeight: 'bold' }}
                >
                    &times;
                </button>

                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Dettagli Assistenza: {selectedTicket.companyName}</h3>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Riferimento:</strong>
                        <div>{selectedTicket.contactName}{selectedTicket.phone && selectedTicket.phone.trim() !== '' && selectedTicket.phone.trim() !== '()' ? ` - ${selectedTicket.phone.trim()}` : ''}</div>
                    </div>
                    <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Aperto da:</strong>
                        <div>{getCreatorName(selectedTicket, users)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>il {new Date(selectedTicket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    </div>
                    <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Preso in carico da:</strong>
                        <div>{getAssigneeName(selectedTicket, users)}</div>
                    </div>
                    <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Stato attuale:</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, color: selectedTicket.status === 'chiuso' ? 'var(--success-color)' : 'var(--danger-color)' }}>{selectedTicket.status.toUpperCase()}</span>
                            {selectedTicket.status === 'chiuso' && (selectedTicket.durationHours !== undefined || selectedTicket.durationMinutes !== undefined) && (
                                <span style={{ fontSize: '0.8rem', backgroundColor: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#166534' }}>
                                    Durata: {selectedTicket.durationHours || 0}h {selectedTicket.durationMinutes || 0}m
                                </span>
                            )}
                        </div>
                    </div>

                    {selectedTicket.status === 'chiuso' && selectedTicket.closedAt && (
                        <div>
                            <strong style={{ color: 'var(--text-secondary)' }}>Chiuso da:</strong>
                            <div>{getClosedByName(selectedTicket, users)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>il {new Date(selectedTicket.closedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                        </div>
                    )}
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

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onEditNotes(selectedTicket)}
                        className="btn btn-primary"
                        style={{ flex: 1, minWidth: '150px' }}
                    >
                        Modifica Appunti
                    </button>
                    <button onClick={() => onDeleteTicket(selectedTicket.id!)} className="btn" style={{ flex: 1, minWidth: '150px', backgroundColor: '#fee2e2', color: 'var(--danger-color)', border: '1px solid #fca5a5' }}>
                        Elimina Ticket
                    </button>
                    <button onClick={onClose} className="btn" style={{ flex: 1, minWidth: '150px', backgroundColor: '#e2e8f0', color: 'var(--text-primary)' }}>
                        Chiudi Finestra
                    </button>
                </div>
            </div>
        </div>
    );
};
