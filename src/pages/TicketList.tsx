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

export const TicketList: React.FC<{ section?: 'sk' | 's2' }> = ({ section = 'sk' }) => {
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
                
                if (userData.role !== 'superadmin') {
                    namesMap[uid] = name;
                    if (userData.status === 'approved') {
                        usersList.push(userData);
                    }
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
        const conditions: any[] = [
            where('status', 'in', ['aperto', 'preso_in_carico'])
        ];

        // Se siamo nella section2 fissa il filtro, altrimenti (sk) usiamo filtro lato client
        // per retrocompatibilità coi vecchi ticket senza campo "section"
        if (section === 's2') {
            conditions.push(where('section', '==', 's2'));
        }

        const q = query(collection(db, 'tickets'), ...conditions);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets: Ticket[] = [];
            snapshot.forEach((doc) => {
                fetchedTickets.push({ id: doc.id, ...doc.data() } as Ticket);
            });

            // Filtro Visibilità v3.1.24
            let finalTickets = fetchedTickets;

            // Filtro retrocompatibilità per Assistenza SK (ticket con section='sk' oppure senza campo section)
            if (section === 'sk') {
                finalTickets = finalTickets.filter(t => !t.section || t.section === 'sk');
            }

            if (settings.visibilityMode === 'assigned_only' && !isAdmin) {
                finalTickets = finalTickets.filter(t => t.assignedTo === currentUser?.uid);
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

    const handleToggleCollaudo = async (ticketId: string, currentStatus: boolean) => {
        try {
            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                isCollaudo: !currentStatus,
                updatedAt: Date.now()
            });
            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, isCollaudo: !currentStatus });
            }
        } catch (err) {
            console.error(err);
            alert('Errore aggiornamento collaudo');
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
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>Caricamento assistenze...</div>
            </div>
        );
    }

    // Determina se mostrare la vista compatta
    const isCompact = settings.layoutMode === 'compact' && (isAdmin || settings.applyCompactToAll);

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: section === 's2' ? (settings.section2Color || 'var(--accent-teal)') : 'var(--text-primary)', marginBottom: '0.1rem' }}>
                        {section === 's2' ? (settings.section2Name || 'Assistenze Sezione 2') : 'Assistenze Attive'}
                    </h2>
                    {isCompact && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>VISTA COMPATTA</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {isAdmin && (
                        <button
                            onClick={() => googleToken ? disconnectGoogle() : connectGoogle()}
                            className="btn"
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                background: googleToken ? 'rgba(20,184,166,0.12)' : 'var(--bg-elevated)',
                                color: googleToken ? 'var(--accent-teal)' : 'var(--text-muted)',
                                border: `1px solid ${googleToken ? 'rgba(20,184,166,0.25)' : 'var(--border-subtle)'}`,
                            }}
                        >
                            <Calendar size={13} />
                            {googleToken ? 'Calendario ✓' : 'Collega Google'}
                        </button>
                    )}
                    <span style={{ fontSize: '0.78rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-color)', border: '1px solid rgba(99,102,241,0.25)', padding: '0.25rem 0.65rem', borderRadius: '100px', fontWeight: 700 }}>
                        {tickets.length}
                    </span>
                </div>
            </div>

            {!isCompact && (
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)', userSelect: 'none' }}>
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
                                onClick={() => setSelectedTicket(ticket)}
                                style={{
                                    padding: '0.9rem 1rem',
                                    cursor: 'pointer',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderTop: `3px solid ${isUrgent ? 'var(--danger-color)' : isTakenByMe ? 'var(--accent-teal)' : (section === 's2' ? (settings.section2Color || 'var(--primary-color)') : 'var(--primary-color)')}`,
                                    borderRadius: 'var(--border-radius-md)',
                                    opacity: isTakenByOthers ? 0.55 : 1,
                                    animation: ticket.highlighted ? 'glowPulse 1.4s ease-in-out infinite' : 'slideInUp 0.3s ease forwards',
                                    position: 'relative',
                                    transition: 'all 0.22s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '120px',
                                    boxShadow: ticket.highlighted ? '0 0 20px rgba(245,158,11,0.3)' : 'var(--shadow-sm)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)';
                                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                                    e.currentTarget.style.background = 'var(--bg-elevated)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                    e.currentTarget.style.background = 'var(--bg-surface)';
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                        {ticket.companyName}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                        <div style={{ marginBottom: '0.2rem', color: 'var(--text-muted)' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{getCreatorName(ticket, allUsers)}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: isTakenByMe ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                                            {getAssigneeName(ticket, allUsers)}
                                        </div>
                                        {ticket.scheduledDate && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Calendar size={11} /> {new Date(ticket.scheduledDate).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
                                        {ticket.isCollaudo && (
                                            <div style={{ color: '#facc15', animation: 'fadeIn 0.5s infinite alternate' }} title="COLLAUDO">
                                                <Zap size={14} fill="#facc15" />
                                            </div>
                                        )}
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
                            style={{
                                padding: '1.1rem 1.25rem',
                                background: 'var(--bg-surface)',
                                borderRadius: 'var(--border-radius-lg)',
                                border: '1px solid var(--border-subtle)',
                                borderLeft: `4px solid ${isUrgent ? 'var(--danger-color)' : isTakenByMe ? 'var(--accent-teal)' : (section === 's2' ? (settings.section2Color || 'var(--primary-color)') : 'var(--primary-color)')}`,
                                opacity: isTakenByOthers ? 0.55 : 1,
                                boxShadow: ticket.highlighted ? '0 0 20px rgba(245,158,11,0.35), var(--shadow-sm)' : 'var(--shadow-sm)',
                                animation: ticket.highlighted ? 'glowPulse 1.4s ease-in-out infinite' : 'slideInUp 0.3s ease forwards',
                                transition: 'all 0.22s',
                            }}
                        >
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>da</span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{getCreatorName(ticket, allUsers)}</span>
                                <span style={{ color: 'var(--border-subtle)', marginInline: '0.2rem' }}>·</span>
                                <span style={{ fontSize: '0.7rem' }}>{new Date(ticket.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.6rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: isUrgent ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                                    {ticket.companyName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.8rem', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ref:</span> <strong style={{ color: 'var(--text-primary)' }}>{ticket.contactName}</strong>{ticket.phone && ticket.phone.trim() !== '' && ticket.phone.trim() !== '()' ? <span style={{ color: 'var(--text-muted)' }}> · {ticket.phone.trim()}</span> : ''}</div>
                                <div style={{ marginTop: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>{ticket.description}</div>
                                {ticket.scheduledDate && (
                                    <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem', padding: '0.6rem 0.9rem', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <Calendar size={15} /> INTERVENTO: {new Date(ticket.scheduledDate).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                                {ticket.notes && (
                                    <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.9rem', background: 'rgba(245,158,11,0.08)', color: '#fcd34d', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', borderLeft: '3px solid rgba(245,158,11,0.4)', whiteSpace: 'pre-wrap' }}>
                                        <strong>Appunti:</strong> {ticket.notes}
                                    </div>
                                )}
                            </div>


                            {isTakenByOthers && isAdmin && (
                                <div style={{ marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--warning-color)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 'var(--border-radius-sm)', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <UserPlus size={14} /> Preso in carico {showOtherAssignees ? `da: ${assigneeName}` : 'da un collega'}
                                </div>
                            )}

                            {isTakenByOthers && !isAdmin ? (
                                <div style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(148,163,184,0.07)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
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

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleToggleHighlight(ticket.id!, !!ticket.highlighted)}
                                            className="btn"
                                            title={ticket.highlighted ? "Rimuovi evidenziazione" : "Evidenzia ticket (Lampeggio)"}
                                            style={{
                                                padding: '0.65rem 0.75rem',
                                                background: ticket.highlighted ? 'rgba(245,158,11,0.12)' : 'transparent',
                                                color: ticket.highlighted ? '#fbbf24' : 'var(--text-muted)',
                                                border: `1px solid ${ticket.highlighted ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`,
                                            }}
                                        >
                                            <Zap size={17} fill={ticket.highlighted ? "#fbbf24" : "none"} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleCollaudo(ticket.id!, !!ticket.isCollaudo)}
                                            className="btn"
                                            title={ticket.isCollaudo ? "Rimuovi Collaudo" : "Segna come Collaudo"}
                                            style={{
                                                padding: '0.65rem 0.75rem',
                                                background: ticket.isCollaudo ? 'rgba(250,204,21,0.15)' : 'transparent',
                                                color: ticket.isCollaudo ? '#facc15' : 'var(--text-muted)',
                                                border: `1px solid ${ticket.isCollaudo ? 'rgba(250,204,21,0.4)' : 'var(--border-subtle)'}`,
                                            }}
                                        >
                                            <Zap size={17} fill={ticket.isCollaudo ? "#facc15" : "none"} /> {ticket.isCollaudo ? 'Collaudo' : 'Segna Collaudo'}
                                        </button>
                                    </div>

                                    {(isTakenByMe || (isTakenByOthers && isAdmin && settings.adminCanReassignOthers)) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => handleUpdateNotes(ticket.id!, ticket.notes)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.65rem' }}
                                                >
                                                    Appunti
                                                </button>
                                                <button
                                                    onClick={() => handleTakeCharge(ticket)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.65rem', background: 'rgba(20,184,166,0.12)', color: 'var(--accent-teal)', border: '1px solid rgba(20,184,166,0.25)' }}
                                                >
                                                    <Calendar size={16} /> {isTakenByMe ? 'Sposta' : 'Forza Sposta'}
                                                </button>
                                                <button
                                                    onClick={() => handleRelease(ticket.id!)}
                                                    className="btn"
                                                    style={{ flex: 1, padding: '0.65rem', background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)' }}
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

            {/* Modal Dettaglio */}
            {selectedTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: '600px', padding: '1.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', animation: 'slideInUp 0.25s ease' }}>
                        <button onClick={() => setSelectedTicket(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingRight: '2rem' }}>
                            <div style={{ width: 4, height: 36, borderRadius: 4, background: selectedTicket.isCollaudo ? '#facc15' : (selectedTicket.urgency === 'urgente' ? 'var(--danger-color)' : selectedTicket.assignedTo === currentUser?.uid ? 'var(--accent-teal)' : 'var(--primary-color)'), flexShrink: 0 }} />
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: selectedTicket.isCollaudo ? '#facc15' : (selectedTicket.urgency === 'urgente' ? 'var(--danger-color)' : 'var(--text-primary)') }}>
                                        {selectedTicket.companyName}
                                    </h3>
                                    {selectedTicket.isCollaudo && <Zap size={16} fill="#facc15" color="#facc15" />}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            {[['Creato da', getCreatorName(selectedTicket, allUsers)], ['Referente', `${selectedTicket.contactName}${selectedTicket.phone && selectedTicket.phone.trim() !== '' && selectedTicket.phone.trim() !== '()' ? ' · ' + selectedTicket.phone.trim() : ''}`], ['In carico a', getAssigneeName(selectedTicket, allUsers)], ['Stato', selectedTicket.status]].map(([label, value]) => (
                                <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem 0.75rem' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '0.9rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Descrizione Problema</div>
                            <p style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{selectedTicket.description}</p>

                            {selectedTicket.photoUrls && selectedTicket.photoUrls.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <p style={{ width: '100%', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>FOTO ALLEGATE</p>
                                    {selectedTicket.photoUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '80px', height: '80px', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                            <img src={url} alt={`Allegato ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedTicket.notes && (
                            <div style={{ padding: '0.9rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem', borderLeft: '3px solid rgba(245,158,11,0.4)', whiteSpace: 'pre-wrap' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Appunti Intervento</div>
                                <p style={{ color: '#fcd34d' }}>{selectedTicket.notes}</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            {selectedTicket.status === 'aperto' && (
                                <button onClick={() => { handleTakeCharge(selectedTicket); setSelectedTicket(null); }} className="btn btn-primary" style={{ flex: 1 }}>
                                    Prendi in Carico
                                </button>
                            )}
                            {(isAdmin || selectedTicket.assignedTo === currentUser?.uid) && (
                                <button onClick={() => handleUpdateNotes(selectedTicket.id!, selectedTicket.notes)} className="btn" style={{ flex: 1, minWidth: '150px' }}>
                                    {isAdmin && selectedTicket.assignedTo !== currentUser?.uid ? 'Modifica Note (Admin)' : 'Appunti'}
                                </button>
                            )}
                            {(selectedTicket.assignedTo === currentUser?.uid || (isAdmin && settings.adminCanReassignOthers && selectedTicket.status === 'preso_in_carico')) && (
                                <button onClick={() => { handleTakeCharge(selectedTicket); setSelectedTicket(null); }} className="btn" style={{ flex: 1, background: 'rgba(20,184,166,0.12)', color: 'var(--accent-teal)', border: '1px solid rgba(20,184,166,0.25)' }}>Sposta</button>
                            )}
                            {(selectedTicket.assignedTo === currentUser?.uid || (isAdmin && settings.adminCanReassignOthers && selectedTicket.status === 'preso_in_carico')) && (
                                <button onClick={() => handleRelease(selectedTicket.id!)} className="btn" style={{ flex: 1, background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)' }}>Rilascia</button>
                            )}
                            {((selectedTicket.assignedTo === currentUser?.uid && (isAdmin || settings.userCanCloseOwnTickets !== false)) || (selectedTicket.assignedTo !== currentUser?.uid && isAdmin && settings.adminCanCloseOthers)) && selectedTicket.status === 'preso_in_carico' && (
                                <button onClick={() => handleCloseTicket(selectedTicket.id!, selectedTicket.notes)} className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>Chiudi Definitivamente</button>
                            )}
                            {isAdmin && (
                                <button onClick={() => handleDeleteTicket(selectedTicket.id!)} className="btn" style={{ flex: 1, background: 'rgba(244,63,94,0.08)', color: 'var(--danger-color)', border: '1px solid rgba(244,63,94,0.15)', minWidth: '150px' }}>
                                    Elimina Ticket
                                </button>
                            )}
                            {isAdmin && selectedTicket.status === 'preso_in_carico' && selectedTicket.assignedTo !== currentUser?.uid && settings.adminCanReassignOthers && (
                                <button onClick={() => setReassignTarget({ ticketId: selectedTicket.id!, oldAssigneeName: userNames[selectedTicket.assignedTo!] || selectedTicket.assignedTo! })} className="btn" style={{ flex: 1, border: '1px solid rgba(165, 180, 252, 0.4)', color: '#a5b4fc', background: 'rgba(99,102,241,0.12)' }}>Riassegna Collega</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Riassegnazione */}
            {reassignTarget && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: '450px', padding: '1.75rem', boxShadow: 'var(--shadow-xl)', animation: 'slideInUp 0.25s ease' }}>
                        <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Riassegna Ticket</h3>
                        <form onSubmit={handleReassign}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nuovo Assegnatario</label>
                                <select
                                    required
                                    value={reassignTo}
                                    onChange={e => setReassignTo(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleziona un collega...</option>
                                    {allUsers.filter(u => u.uid !== currentUser?.uid).map(u => (
                                        <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Motivo della riassegnazione</label>
                                <textarea
                                    placeholder="Scrivi qui perché stai spostando il ticket..."
                                    value={reassignReason}
                                    onChange={e => setReassignReason(e.target.value)}
                                    style={{ width: '100%', minHeight: '80px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="button" onClick={() => setReassignTarget(null)} className="btn" style={{ flex: 1 }}>Annulla</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    <Send size={16} /> Conferma
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Presa in Carico / Calendario */}
            {takeChargeTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: '450px', padding: '1.75rem', boxShadow: 'var(--shadow-xl)', animation: 'slideInUp 0.25s ease' }}>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{takeChargeTicket.status === 'preso_in_carico' ? 'Sposta / Riprogramma Intervento' : 'Prendi in Carico'}</h3>
                        <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {takeChargeTicket.status === 'preso_in_carico'
                                ? `Stai aggiornando la pianificazione per ${takeChargeTicket.companyName}.`
                                : `Stai prendendo in carico l'assistenza per ${takeChargeTicket.companyName}.`}
                        </p>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pianifica data e ora (opzionale)</label>
                            <input
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={e => setScheduledDateTime(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {isAdmin && scheduledDateTime && (
                            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                <input
                                    type="checkbox"
                                    id="syncToCalendar"
                                    checked={syncToCalendar}
                                    onChange={e => setSyncToCalendar(e.target.checked)}
                                    disabled={!googleToken}
                                />
                                <label htmlFor="syncToCalendar" style={{ fontSize: '0.875rem', cursor: googleToken ? 'pointer' : 'default', color: googleToken ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    Crea evento su Google Calendar
                                    {!googleToken && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--danger-color)', marginTop: '0.2rem' }}>Collega il tuo account Google per attivare questa opzione.</span>}
                                </label>
                            </div>
                        )}

                        {isAdmin && !googleToken && scheduledDateTime && (
                            <button
                                onClick={() => connectGoogle()}
                                className="btn"
                                style={{ width: '100%', marginBottom: '1rem', background: 'rgba(20,184,166,0.10)', color: 'var(--accent-teal)', border: '1px solid rgba(20,184,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <LinkIcon size={16} /> Collega Google ora
                            </button>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setTakeChargeTicket(null)}
                                className="btn"
                                disabled={calendarLoading}
                                style={{ flex: 1 }}
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
