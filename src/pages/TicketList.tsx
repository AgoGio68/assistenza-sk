import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ticket } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, Check, UserPlus } from 'lucide-react';

export const TicketList: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    // Notifiche gestite tramite Cloud Functions e Service Worker (FCM) 
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    useEffect(() => {
        // Fetch users to map uid -> displayName
        import('firebase/firestore').then(({ getDocs, collection }) => {
            getDocs(collection(db, 'users')).then(snapshot => {
                const namesMap: Record<string, string> = {};
                snapshot.forEach(doc => {
                    namesMap[doc.data().uid] = doc.data().displayName || doc.data().email || 'Utente Sconosciuto';
                });
                setUserNames(namesMap);
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

            // Ordiniamo lato client per evitare l'errore di Indice Composto mancante su Firebase
            fetchedTickets.sort((a, b) => b.createdAt - a.createdAt);

            setTickets(fetchedTickets);
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

    const handleUpdateNotes = async (ticketId: string, currentNotes: string = '') => {
        const newNotes = window.prompt("Scrivi o modifica gli appunti dell'intervento:", currentNotes);
        if (newNotes === null) return; // User cancelled

        try {
            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                notes: newNotes,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert('Errore salvataggio appunti');
        }
    };

    const handleCloseTicket = async (ticketId: string, currentNotes: string = '') => {
        try {
            const notes = window.prompt("Appunti finali per la chiusura (Opzionale):", currentNotes);
            if (notes === null) return; // user cancelled

            const ticketRef = doc(db, 'tickets', ticketId);
            await updateDoc(ticketRef, {
                status: 'chiuso',
                closedBy: currentUser?.uid,
                closedAt: Date.now(),
                notes: notes || '',
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error(err);
            alert('Errore chiusura ticket');
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>Caricamento assistenze...</div>;
    }

    if (tickets.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3>Nessuna assistenza in attesa</h3>
                <p>Tutto tranquillo al momento.</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Assistenze Attive
                <span style={{ fontSize: '0.875rem', background: 'var(--secondary-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                    {tickets.length}
                </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tickets.map((ticket) => {
                    const isUrgent = ticket.urgency === 'urgente';
                    const isTakenByMe = ticket.assignedTo === currentUser?.uid;
                    const isTakenByOthers = ticket.status === 'preso_in_carico' && !isTakenByMe;
                    const assigneeName = ticket.assignedTo ? (userNames[ticket.assignedTo] || ticket.assignedTo) : '';

                    return (
                        <div
                            key={ticket.id}
                            className="glass-panel"
                            style={{
                                padding: '1.25rem',
                                borderLeft: isUrgent ? '4px solid var(--danger-color)' : '4px solid var(--success-color)',
                                opacity: isTakenByOthers ? 0.6 : 1
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
                                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.875rem', borderLeft: '3px solid #f59e0b' }}>
                                        <strong>Appunti:</strong> {ticket.notes}
                                    </div>
                                )}
                            </div>


                            {isTakenByOthers && isAdmin && (
                                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--warning-color)' }}>
                                    Preso in carico da: {assigneeName} (Admin può riassegnare)
                                </div>
                            )}

                            {isTakenByOthers && !isAdmin ? (
                                <div style={{ fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', textAlign: 'center' }}>
                                    Preso in carico da {assigneeName}
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

                                    {/* Fallback per Admin per riassegnare - semplificato per ora */}
                                    {ticket.status === 'preso_in_carico' && isAdmin && !isTakenByMe && (
                                        <button
                                            onClick={() => handleTakeCharge(ticket.id!)}
                                            className="btn"
                                            style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--primary-color)' }}
                                        >
                                            Riassegna a me
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
