import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ticket, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Check, UserPlus, X, Send, Calendar, Link as LinkIcon, Zap } from 'lucide-react';
import { VoiceDictationModal } from '../components/VoiceDictationModal';
import { useSettings } from '../contexts/SettingsContext';
import { getCreatorName, getAssigneeName } from '../utils/nameUtils';
import { createGoogleCalendarEvent, formatTicketToEvent } from '../utils/calendarUtils';
import { CloseTicketModal } from '../components/CloseTicketModal';

export const TicketList: React.FC = () => {
    const { currentUser, isAdmin, userProfile, connectGoogle, googleToken, disconnectGoogle } = useAuth();
    const { settings } = useSettings();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

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

    // Take Charge / Calendar State
    const [takeChargeTicket, setTakeChargeTicket] = useState<Ticket | null>(null);
    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [syncToCalendar, setSyncToCalendar] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);

    useEffect(() => {
        // Fetch users to map uid -> displayName in real-time
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const namesMap: Record<string, string> = {};
            const usersList: UserProfile[] = [];

            snapshot.forEach(doc => {
                const userData = doc.data() as UserProfile;
                const uid = doc.id;
                userData.uid = uid; // Ensure uid is present
                const name = userData.displayName || userData.email || 'Utente Sconosciuto';

                namesMap[uid] = name;
                if (userData.status === 'approved') {
                    usersList.push(userData);
                }
            });

            setUserNames(namesMap);
            setAllUsers(usersList);
        });

        return () => unsubscribe();
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

    const handleTakeCharge = (ticket: Ticket) => {
        setTakeChargeTicket(ticket);
        setSyncToCalendar(!!googleToken);

        if (ticket.scheduledDate) {
            setScheduledDateTime(ticket.scheduledDate);
        } else {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setScheduledDateTime(`${yyyy}-${mm}-${dd}T08:00`);
        }
    };

    const handleConfirmTakeCharge = async () => {
        if (!takeChargeTicket) return;

        try {
            setCalendarLoading(true);
            const ticketRef = doc(db, 'tickets', takeChargeTicket.id!);

            // 1. Optional Calendar Sync
            if (syncToCalendar && scheduledDateTime) {
                if (!googleToken) {
                    alert('Attenzione: Hai richiesto la sincronizzazione, ma non sei collegato a Google Calendar. Clicca su "Collega Google" dalla lista delle assistenze.');
                } else {
                    const event = formatTicketToEvent(
                        takeChargeTicket.companyName,
                        takeChargeTicket.description,
                        new Date(scheduledDateTime),
                        window.location.origin
                    );

                    try {
                        console.log("Creazione evento in corso con Token...", googleToken);
                        await createGoogleCalendarEvent(googleToken, event);
                        alert('Evento creato in Google Calendar!');
                    } catch (calErr: any) {
                        console.error("Calendar Sync Failed:", calErr);
                        alert(`Operazione salvata, ma la sincronizzazione del calendario è fallita: ${calErr.message || "Errore sconosciuto"}`);
                    }
                }
            }

            // 2. Update Firestore
            const updatePayload: any = {
                status: 'preso_in_carico',
                updatedAt: Date.now()
            };

            // Se era aperto, lo assegno all'utente corrente
            if (takeChargeTicket.status === 'aperto') {
                updatePayload.assignedTo = currentUser?.uid;
                updatePayload.assigneeName = userProfile?.displayName || userProfile?.email || 'Collega';
            }

            if (scheduledDateTime) {
                updatePayload.scheduledDate = scheduledDateTime;
            }

            await updateDoc(ticketRef, updatePayload);

            setTakeChargeTicket(null);
            setScheduledDateTime('');
        } catch (err) {
            console.error(err);
            alert('Errore durante il salvataggio');
        } finally {
            setCalendarLoading(false);
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
            setSelectedTicket(null);
            setTakeChargeTicket(null);
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

    const handleToggleHighlight = async (ticketId: string, currentStatus: boolean) => {
        try {
            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                highlighted: !currentStatus,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert('Errore aggiornamento evidenziazione');
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
            }
        } catch (err) {
            console.error(err);
            alert('Errore salvataggio ticket con note');
        } finally {
            setIsDictationModalOpen(false);
            setDictationTarget(null);
        }
    };

    const handleSaveClosure = async (hours: number, minutes: number, newNotes: string) => {
        if (!dictationTarget || dictationTarget.action !== 'close') return;

        try {
            const ticketId = dictationTarget.id;
            // Ottimizzazione v1.7.9: Rimuovi subito dalla lista locale
            setTickets(prev => prev.filter(t => t.id !== ticketId));
            setSelectedTicket(null); // Chiudi anche il dettaglio se aperto

            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                status: 'chiuso',
                closedBy: currentUser?.uid,
                closedAt: Date.now(),
                notes: newNotes,
                durationHours: hours,
                durationMinutes: minutes,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert('Errore durante la chiusura del ticket');
            // Re-fetch or rely on next snapshot if error occurs
        } finally {
            setIsDictationModalOpen(false);
            setDictationTarget(null);
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!window.confirm('Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo ticket? L\'azione è irreversibile.')) return;
        try {
            await deleteDoc(doc(db, 'tickets', ticketId));
            setSelectedTicket(null);
            // Non serve setTickets perché onSnapshot aggiornerà la lista automaticamente
        } catch (err) {
            console.error(err);
            alert("Errore durante l'eliminazione del ticket.");
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
                    {isAdmin && (
                        <button
                            onClick={() => googleToken ? disconnectGoogle() : connectGoogle()}
                            className="btn"
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.3rem 0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                backgroundColor: googleToken ? '#dcfce7' : '#f1f5f9',
                                color: googleToken ? '#166534' : 'var(--text-secondary)'
                            }}
                        >
                            <Calendar size={14} />
                            {googleToken ? 'Calendario Collegato' : 'Collega Google'}
                        </button>
                    )}
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
                    const assigneeName = ticket.assignedTo ? (userNames[ticket.assignedTo] || 'Sconosciuto') : '';

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
                                    animation: ticket.highlighted ? 'blink 1s infinite ease-in-out' : 'none',
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
                                        <div style={{ marginBottom: '0.25rem' }}>
                                            Creato da: <strong>{getCreatorName(ticket, allUsers)}</strong>
                                        </div>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            In carico a: <strong>{getAssigneeName(ticket, allUsers)}</strong>
                                        </div>
                                        {ticket.scheduledDate && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Calendar size={12} /> Pianificato: {new Date(ticket.scheduledDate).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                        {ticket.updatedAt && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                                Aggiornato: {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {ticket.description}
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleHighlight(ticket.id!, !!ticket.highlighted); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.2rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: ticket.highlighted ? '#d97706' : '#94a3b8'
                                            }}
                                            title={ticket.highlighted ? "Rimuovi evidenziazione" : "Evidenzia"}
                                        >
                                            <Zap size={14} fill={ticket.highlighted ? "#d97706" : "none"} />
                                        </button>
                                        {isTakenByOthers && <span title={assigneeName}><UserPlus size={14} color="var(--warning-color)" /></span>}
                                        {isTakenByMe && <Check size={14} color="var(--success-color)" />}
                                    </div>
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
                                boxShadow: ticket.highlighted ? '0 0 15px rgba(59, 130, 246, 0.5)' : '0 2px 4px rgba(0,0,0,0.05)',
                                animation: ticket.highlighted ? 'blink 1s infinite ease-in-out' : 'none',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Creato da: <strong>{getCreatorName(ticket, allUsers)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.125rem', color: isUrgent ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                                    {ticket.companyName}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                <div><strong>Ref:</strong> {ticket.contactName}{ticket.phone && ticket.phone.trim() !== '' && ticket.phone.trim() !== '()' ? ` - ${ticket.phone.trim()}` : ''}</div>
                                <div style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>{ticket.description}</div>
                                {ticket.scheduledDate && (
                                    <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '4px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                        <Calendar size={18} /> INTERVENTO PROGRAMMATO: {new Date(ticket.scheduledDate).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
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
                                            onClick={() => handleTakeCharge(ticket)}
                                            className="btn btn-primary"
                                            style={{ flex: 1, padding: '0.75rem' }}
                                        >
                                            <UserPlus size={18} /> Prendi in Carico
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleToggleHighlight(ticket.id!, !!ticket.highlighted)}
                                        className="btn"
                                        title={ticket.highlighted ? "Rimuovi evidenziazione" : "Evidenzia ticket (Lampeggio)"}
                                        style={{
                                            padding: '0.75rem',
                                            backgroundColor: ticket.highlighted ? '#fef3c7' : '#f1f5f9',
                                            color: ticket.highlighted ? '#d97706' : '#64748b',
                                            border: ticket.highlighted ? '1px solid #f59e0b' : '1px solid #cbd5e1'
                                        }}
                                    >
                                        <Zap size={18} fill={ticket.highlighted ? "#d97706" : "none"} />
                                    </button>

                                    {(isTakenByMe || (isTakenByOthers && isAdmin && settings.adminCanReassignOthers)) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => handleUpdateNotes(ticket.id!, ticket.notes)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', color: '#1e293b' }}
                                                >
                                                    Appunti
                                                </button>
                                                <button
                                                    onClick={() => handleTakeCharge(ticket)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #166534' }}
                                                >
                                                    <Calendar size={18} /> {isTakenByMe ? 'Sposta' : 'Forza Sposta'}
                                                </button>
                                                <button
                                                    onClick={() => handleRelease(ticket.id!)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#fca5a5', color: '#991b1b' }}
                                                >
                                                    {isTakenByMe ? 'Rilascia' : 'Forza Rilascia'}
                                                </button>
                                            </div>

                                            {((isTakenByMe && (isAdmin || settings.userCanCloseOwnTickets !== false)) || (isTakenByOthers && isAdmin && settings.adminCanCloseOthers)) && (
                                                <button
                                                    onClick={() => handleCloseTicket(ticket.id!, ticket.notes)}
                                                    className="btn btn-success"
                                                    style={{ width: '100%', padding: '0.75rem' }}
                                                >
                                                    <Check size={18} /> Chiudi Definitivamente
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {ticket.status === 'preso_in_carico' && isAdmin && !isTakenByMe && settings.adminCanReassignOthers && (
                                        <button
                                            onClick={() => setReassignTarget({ ticketId: ticket.id!, oldAssigneeName: assigneeName })}
                                            className="btn"
                                            style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--primary-color)' }}
                                        >
                                            Riassegna Diretto
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
                            <p><strong>Creato da:</strong> {getCreatorName(selectedTicket, allUsers)}</p>
                            <p><strong>Referente:</strong> {selectedTicket.contactName}{selectedTicket.phone && selectedTicket.phone.trim() !== '' && selectedTicket.phone.trim() !== '()' ? ` (${selectedTicket.phone.trim()})` : ''}</p>
                            <p><strong>In carico a:</strong> {getAssigneeName(selectedTicket, allUsers)}</p>
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
                                <button onClick={() => { handleTakeCharge(selectedTicket); setSelectedTicket(null); }} className="btn btn-primary" style={{ flex: 1 }}>
                                    Prendi in Carico
                                </button>
                            )}
                            {(isAdmin || selectedTicket.assignedTo === currentUser?.uid) && (
                                <button onClick={() => handleUpdateNotes(selectedTicket.id!, selectedTicket.notes)} className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0', minWidth: '150px' }}>
                                    {isAdmin && selectedTicket.assignedTo !== currentUser?.uid ? 'Modifica Note (Admin)' : 'Appunti'}
                                </button>
                            )}
                            {(selectedTicket.assignedTo === currentUser?.uid || (isAdmin && settings.adminCanReassignOthers && selectedTicket.status === 'preso_in_carico')) && (
                                <button onClick={() => { handleTakeCharge(selectedTicket); setSelectedTicket(null); }} className="btn" style={{ flex: 1, backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #166534' }}>Sposta</button>
                            )}
                            {(selectedTicket.assignedTo === currentUser?.uid || (isAdmin && settings.adminCanReassignOthers && selectedTicket.status === 'preso_in_carico')) && (
                                <button onClick={() => handleRelease(selectedTicket.id!)} className="btn" style={{ flex: 1, backgroundColor: '#fca5a5' }}>Rilascia</button>
                            )}
                            {((selectedTicket.assignedTo === currentUser?.uid && (isAdmin || settings.userCanCloseOwnTickets !== false)) || (selectedTicket.assignedTo !== currentUser?.uid && isAdmin && settings.adminCanCloseOthers)) && selectedTicket.status === 'preso_in_carico' && (
                                <button onClick={() => handleCloseTicket(selectedTicket.id!, selectedTicket.notes)} className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>Chiudi Definitivamente</button>
                            )}
                            {isAdmin && (
                                <button onClick={() => handleDeleteTicket(selectedTicket.id!)} className="btn" style={{ flex: 1, backgroundColor: '#fee2e2', color: 'var(--danger-color)', border: '1px solid #fca5a5', minWidth: '150px' }}>
                                    Elimina Ticket
                                </button>
                            )}
                            {isAdmin && selectedTicket.status === 'preso_in_carico' && selectedTicket.assignedTo !== currentUser?.uid && settings.adminCanReassignOthers && (
                                <button onClick={() => setReassignTarget({ ticketId: selectedTicket.id!, oldAssigneeName: userNames[selectedTicket.assignedTo!] || selectedTicket.assignedTo! })} className="btn" style={{ flex: 1, border: '1px solid var(--primary-color)' }}>Riassegna Collega</button>
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

            {/* Modal Presa in Carico / Calendario */}
            {takeChargeTicket && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>{takeChargeTicket.status === 'preso_in_carico' ? 'Sposta / Riprogramma Intervento' : 'Prendi in Carico'}</h3>
                        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {takeChargeTicket.status === 'preso_in_carico'
                                ? `Stai aggiornando la pianificazione per ${takeChargeTicket.companyName}.`
                                : `Stai prendendo in carico l'assistenza per ${takeChargeTicket.companyName}.`}
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Pianifica data e ora (opzionale)</label>
                            <input
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={e => setScheduledDateTime(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        {isAdmin && scheduledDateTime && (
                            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                <input
                                    type="checkbox"
                                    id="syncToCalendar"
                                    checked={syncToCalendar}
                                    onChange={e => setSyncToCalendar(e.target.checked)}
                                    disabled={!googleToken}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <label htmlFor="syncToCalendar" style={{ fontSize: '0.875rem', cursor: googleToken ? 'pointer' : 'default' }}>
                                    Crea evento su Google Calendar
                                    {!googleToken && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--danger-color)' }}>Collega il tuo account Google per attivare questa opzione.</span>}
                                </label>
                            </div>
                        )}

                        {isAdmin && !googleToken && scheduledDateTime && (
                            <button
                                onClick={() => connectGoogle()}
                                className="btn"
                                style={{ width: '100%', marginBottom: '1rem', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <LinkIcon size={18} /> Collega Google ora
                            </button>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setTakeChargeTicket(null)}
                                className="btn"
                                disabled={calendarLoading}
                                style={{ flex: 1, backgroundColor: '#e2e8f0' }}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleConfirmTakeCharge}
                                className="btn btn-primary"
                                disabled={calendarLoading}
                                style={{ flex: 1 }}
                            >
                                {calendarLoading ? 'Salvataggio...' : 'Conferma'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <VoiceDictationModal
                isOpen={isDictationModalOpen && dictationTarget?.action === 'update'}
                onClose={() => { setIsDictationModalOpen(false); setDictationTarget(null); }}
                onSave={handleSaveDictation}
                initialText={dictationTarget?.notes || ''}
                title="Modifica Note"
            />

            <CloseTicketModal
                isOpen={isDictationModalOpen && dictationTarget?.action === 'close'}
                onClose={() => { setIsDictationModalOpen(false); setDictationTarget(null); }}
                onSave={handleSaveClosure}
                initialNotes={dictationTarget?.notes || ''}
            />
        </div>
    );
};
