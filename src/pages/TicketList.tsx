import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ticket } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Check, UserPlus, X, Send } from 'lucide-react';
import { VoiceDictationModal } from '../components/VoiceDictationModal';
import { useSettings } from '../contexts/SettingsContext';

export const TicketList: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const { settings } = useSettings();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<{ uid: string, displayName: string }[]>([]);

    // Notifiche gestite tramite Cloud Functions e Service Worker (FCM) 
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [showOtherAssignees, setShowOtherAssignees] = useState(false);

    // Modal State
    const [isDictationModalOpen, setIsDictationModalOpen] = useState(false);
    const [dictationTarget, setDictationTarget] = useState<{ id: string, notes: string, action: 'update' | 'close' } | null>(null);

    // New Detail/Reassign State
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [reassignTarget, setReassignTarget] = useState<{ ticketId: string, oldAssigneeName: string } | null>(null);
    const [reassignTo, setReassignTo] = useState('');
    const [reassignReason, setReassignReason] = useState('');

    useEffect(() => {
        // Fetch users to map uid -> displayName
        import('firebase/firestore').then(({ getDocs, collection }) => {
            getDocs(collection(db, 'users')).then(snapshot => {
                const namesMap: Record<string, string> = {};
                const usersList: { uid: string, displayName: string }[] = [];
                snapshot.forEach(doc => {
                    const userData = doc.data();
                    const name = userData.displayName || userData.email || 'Utente Sconosciuto';
                    namesMap[userData.uid] = name;
                    if (userData.status === 'approved') {
                        usersList.push({ uid: userData.uid, displayName: name });
                    }
                });
                setUserNames(namesMap);
                setAllUsers(usersList);
            });
        });
    }, []);

    useEffect(() => {
        // Esci se non loggato
        if (!currentUser) return;

        // View open or in-progress tickets
        const q = query(
            collection(db, 'tickets'),
            where('status', 'in', ['aperto', 'preso_in_carico'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets: Ticket[] = [];
            snapshot.forEach((doc) => {
                fetchedTickets.push({ id: doc.id, ...doc.data() } as Ticket);
            });

            // Filtro Visibilità v1.5.1
            let finalTickets = fetchedTickets;
            if (settings.visibilityMode === 'assigned_only' && !isAdmin) {
                finalTickets = fetchedTickets.filter(t => t.assignedTo === currentUser?.uid);
            }

            // Ordiniamo lato client: prima i miei in carico (priorità massima), poi gli altri ordinati per data
            finalTickets.sort((a, b) => {
                const aIsMine = a.assignedTo === currentUser?.uid;
                const bIsMine = b.assignedTo === currentUser?.uid;

                if (aIsMine && !bIsMine) return -1;
                if (!aIsMine && bIsMine) return 1;

                return b.createdAt - a.createdAt;
            });

            setTickets(finalTickets);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleTakeCharge = async (ticketId: string) => {
        if (!window.confirm("Sei sicuro di voler PRENDERE IN CARICO questa assistenza?")) return;
        try {
            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                status: 'preso_in_carico',
                assignedTo: currentUser?.uid,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert('Errore presa in carico');
        }
    };

    const handleRelease = async (ticketId: string) => {
        if (!window.confirm("Vuoi davvero RILASCIARE questo ticket e rimetterlo a disposizione di tutti?")) return;
        try {
            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                status: 'aperto',
                assignedTo: null,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert('Errore rilascio ticket');
        }
    };

    const handleUpdateNotes = (ticketId: string, currentNotes: string = '') => {
        setDictationTarget({ id: ticketId, notes: currentNotes, action: 'update' });
        setIsDictationModalOpen(true);
    };

    const handleCloseTicket = (ticketId: string, currentNotes: string = '') => {
        setDictationTarget({ id: ticketId, notes: currentNotes, action: 'close' });
        setIsDictationModalOpen(true);
    };

    const handleReassign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reassignTarget || !reassignTo) return;

        try {
            const ticketRef = doc(db, 'tickets', reassignTarget.ticketId);
            const newAssigneeName = userNames[reassignTo] || 'Collega';
            const systemNote = `\n[RIASSEGNAZIONE] Da ${reassignTarget.oldAssigneeName} a ${newAssigneeName}. Motivo: ${reassignReason || 'Non specificato'}`;

            // Trova il ticket attuale per prendere le note vecchie
            const currentTicket = tickets.find(t => t.id === reassignTarget.ticketId);
            const updatedNotes = (currentTicket?.notes || '') + systemNote;

            await updateDoc(ticketRef, {
                assignedTo: reassignTo,
                notes: updatedNotes,
                updatedAt: Date.now()
            });

            alert(`Ticket riassegnato a ${newAssigneeName}`);
            setReassignTarget(null);
            setReassignTo('');
            setReassignReason('');
            setSelectedTicket(null); // Chiudi dettaglio se aperto
        } catch (err) {
            console.error(err);
            alert('Errore durante la riassegnazione');
        }
    };

    const handleSaveDictation = async (newNotes: string) => {
        if (!dictationTarget) return;

        try {
            const ticketRef = doc(db, 'tickets', dictationTarget.id);
            if (dictationTarget.action === 'update') {
                await updateDoc(ticketRef, {
                    notes: newNotes,
                    updatedAt: Date.now()
                });
            } else if (dictationTarget.action === 'close') {
                await updateDoc(ticketRef, {
                    status: 'chiuso',
                    closedBy: currentUser?.uid,
                    closedAt: Date.now(),
                    notes: newNotes,
                    updatedAt: Date.now()
                });
            }
        } catch (err) {
            console.error(err);
            alert('Errore salvataggio ticket con note');
        } finally {
            setIsDictationModalOpen(false);
            setDictationTarget(null);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>Caricamento assistenze...</div>;
    }

    // Determina se mostrare la vista compatta
    const isCompact = settings.layoutMode === 'compact' && (isAdmin || settings.applyCompactToAll);

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Assistenze Attive
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isCompact && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>Vista Compatta Attiva</span>}
                    <span style={{ fontSize: '0.875rem', background: 'var(--secondary-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                        {tickets.length}
                    </span>
                </div>
            </h2>

            {!isCompact && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={showOtherAssignees}
                            onChange={(e) => setShowOtherAssignees(e.target.checked)}
                        />
                        Mostra chi ha preso in carico gli altri ticket
                    </label>
                </div>
            )}

            <div style={isCompact ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
            } : {
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {tickets.map((ticket) => {
                    const isUrgent = ticket.urgency === 'urgente';
                    const isTakenByMe = ticket.assignedTo === currentUser?.uid;
                    const isTakenByOthers = ticket.status === 'preso_in_carico' && !isTakenByMe;
                    const assigneeName = ticket.assignedTo ? (userNames[ticket.assignedTo] || ticket.assignedTo) : '';

                    if (isCompact) {
                        return (
                            <div
                                key={ticket.id}
                                className="glass-panel"
                                onClick={() => setSelectedTicket(ticket)}
                                style={{
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    border: '1px solid #cbd5e1',
                                    borderTop: isUrgent ? '4px solid var(--danger-color)' : '4px solid var(--success-color)',
                                    opacity: isTakenByOthers ? 0.6 : 1,
                                    position: 'relative',
                                    transition: 'transform 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '120px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ticket.companyName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        {ticket.contactName}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {ticket.description}
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isTakenByOthers && <span title={assigneeName}><UserPlus size={14} color="var(--warning-color)" /></span>}
                                    {isTakenByMe && <Check size={14} color="var(--success-color)" />}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={ticket.id}
                            className="glass-panel"
                            style={{
                                padding: '1.25rem',
                                border: '1px solid #cbd5e1',
                                borderLeft: isUrgent ? '6px solid var(--danger-color)' : '6px solid var(--success-color)',
                                opacity: isTakenByOthers ? 0.6 : 1,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.125rem', color: isUrgent ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                                    {ticket.companyName}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                <div><strong>Ref:</strong> {ticket.contactName} - {ticket.phone}</div>
                                <div style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>{ticket.description}</div>
                                {ticket.notes && (
                                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.875rem', borderLeft: '3px solid #f59e0b', whiteSpace: 'pre-wrap' }}>
                                        <strong>Appunti:</strong> {ticket.notes}
                                    </div>
                                )}
                            </div>


                            {isTakenByOthers && isAdmin && (
                                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--warning-color)' }}>
                                    Preso in carico {showOtherAssignees ? `da: ${assigneeName}` : 'da un collega'} (Admin può riassegnare)
                                </div>
                            )}

                            {isTakenByOthers && !isAdmin ? (
                                <div style={{ fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', textAlign: 'center' }}>
                                    Preso in carico {showOtherAssignees ? `da ${assigneeName}` : 'da un collega'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {ticket.status === 'aperto' && (
                                        <button
                                            onClick={() => handleTakeCharge(ticket.id!)}
                                            className="btn btn-primary"
                                            style={{ flex: 1, padding: '0.75rem' }}
                                        >
                                            <UserPlus size={18} /> Prendi in Carico
                                        </button>
                                    )}

                                    {isTakenByMe && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleUpdateNotes(ticket.id!, ticket.notes)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', color: '#1e293b' }}
                                                >
                                                    Appunti
                                                </button>
                                                <button
                                                    onClick={() => handleRelease(ticket.id!)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#fca5a5', color: '#991b1b' }}
                                                >
                                                    Rilascia
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleCloseTicket(ticket.id!, ticket.notes)}
                                                className="btn btn-success"
                                                style={{ width: '100%', padding: '0.75rem' }}
                                            >
                                                <Check size={18} /> Chiudi Definitivamente
                                            </button>
                                        </div>
                                    )}

                                    {ticket.status === 'preso_in_carico' && isAdmin && !isTakenByMe && (
                                        <button
                                            onClick={() => setReassignTarget({ ticketId: ticket.id!, oldAssigneeName: assigneeName })}
                                            className="btn"
                                            style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--primary-color)' }}
                                        >
                                            Riassegna Collega
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal Dettaglio (per vista compatta o visione estesa) */}
            {selectedTicket && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setSelectedTicket(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <X size={24} />
                        </button>

                        <h3 style={{ marginBottom: '1rem', color: selectedTicket.urgency === 'urgente' ? 'var(--danger-color)' : 'inherit' }}>
                            {selectedTicket.companyName}
                        </h3>

                        <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <p><strong>Aperto il:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                            <p><strong>Referente:</strong> {selectedTicket.contactName} ({selectedTicket.phone})</p>
                            {selectedTicket.assignedTo && <p><strong>In carico a:</strong> {userNames[selectedTicket.assignedTo] || selectedTicket.assignedTo}</p>}
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Descrizione Problema:</p>
                            <p>{selectedTicket.description}</p>

                            {selectedTicket.photoUrls && selectedTicket.photoUrls.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <p style={{ width: '100%', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>FOTO ALLEGATE:</p>
                                    {selectedTicket.photoUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer" title="Clicca per ingrandire" style={{ display: 'block', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                            <img src={url} alt={`Allegato ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedTicket.notes && (
                            <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b', whiteSpace: 'pre-wrap' }}>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#92400e' }}>Appunti Intervento:</p>
                                <p style={{ color: '#92400e' }}>{selectedTicket.notes}</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {selectedTicket.status === 'aperto' && (
                                <button onClick={() => { handleTakeCharge(selectedTicket.id!); setSelectedTicket(null); }} className="btn btn-primary" style={{ flex: 1 }}>
                                    Prendi in Carico
                                </button>
                            )}
                            {(isAdmin || selectedTicket.assignedTo === currentUser?.uid) && (
                                <button onClick={() => handleUpdateNotes(selectedTicket.id!, selectedTicket.notes)} className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0', minWidth: '150px' }}>
                                    {isAdmin && selectedTicket.assignedTo !== currentUser?.uid ? 'Modifica Note (Admin)' : 'Appunti'}
                                </button>
                            )}
                            {selectedTicket.assignedTo === currentUser?.uid && (
                                <>
                                    <button onClick={() => handleRelease(selectedTicket.id!)} className="btn" style={{ flex: 1, backgroundColor: '#fca5a5' }}>Rilascia</button>
                                    <button onClick={() => handleCloseTicket(selectedTicket.id!, selectedTicket.notes)} className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>Chiudi Definitivamente</button>
                                </>
                            )}
                            {isAdmin && selectedTicket.status === 'preso_in_carico' && selectedTicket.assignedTo !== currentUser?.uid && (
                                <button onClick={() => setReassignTarget({ ticketId: selectedTicket.id!, oldAssigneeName: userNames[selectedTicket.assignedTo!] || selectedTicket.assignedTo! })} className="btn" style={{ flex: 1, border: '1px solid var(--primary-color)' }}>Riassegna</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Riassegnazione */}
            {reassignTarget && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Riassegna Ticket</h3>
                        <form onSubmit={handleReassign}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nuovo Assegnatario</label>
                                <select
                                    required
                                    value={reassignTo}
                                    onChange={e => setReassignTo(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="">Seleziona un collega...</option>
                                    {allUsers.filter(u => u.uid !== currentUser?.uid).map(u => (
                                        <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Motivo della riassegnazione</label>
                                <textarea
                                    placeholder="Scrivi qui perché stai spostando il ticket..."
                                    value={reassignReason}
                                    onChange={e => setReassignReason(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', minHeight: '80px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="button" onClick={() => setReassignTarget(null)} className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0' }}>Annulla</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    <Send size={18} /> Conferma
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <VoiceDictationModal
                isOpen={isDictationModalOpen}
                onClose={() => setIsDictationModalOpen(false)}
                onSave={handleSaveDictation}
                initialText={dictationTarget?.notes || ''}
                title={dictationTarget?.action === 'close' ? 'Appunti finali per la chiusura' : 'Aggiungi Note Intervento (Microfono)'}
            />
        </div>
    );
};
