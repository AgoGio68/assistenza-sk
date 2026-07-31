import React, { createContext, useContext, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Ticket } from '../types';

interface TicketNotificationContextType {
    // No specific methods needed for now, but context is good for global lifecycle
}

const TicketNotificationContext = createContext<TicketNotificationContextType | null>(null);

export const TicketNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const startTime = useRef(Date.now());

    useEffect(() => {
        if (!currentUser) return;

        console.log("[TicketNotification] Starting listener...", { isAdmin, uid: currentUser.uid });

        // Listener su tutti i ticket aperti o in carico (quelli che attiverebbero notifiche)
        // Usiamo un timestamp per assicurarci di vedere solo i NUOVI ticket creati dopo l'apertura dell'app
        const q = query(
            collection(db, 'tickets'),
            where('createdAt', '>', startTime.current),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const ticket = { id: change.doc.id, ...change.doc.data() } as Ticket;
                    
                    // Task 2: Logica di Destinazione
                    let shouldNotify = false;

                    // Scenario A: Assegnato a me
                    if (ticket.assignedTo === currentUser.uid) {
                        shouldNotify = true;
                    }
                    // Scenario B: Non assegnato + sono Admin
                    else if (!ticket.assignedTo && isAdmin) {
                        shouldNotify = true;
                    }

                    if (shouldNotify) {
                        showTicketToast(ticket);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [currentUser, isAdmin]);

    const showTicketToast = (ticket: Ticket) => {
        const title = "⚠️ NUOVO TICKET";
        const desc = ticket.companyName + (ticket.description ? ` - ${ticket.description.substring(0, 50)}...` : "");

        toast((t) => (
            <div className="flex flex-col gap-2">
                <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{desc}</p>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                    >
                        Chiudi
                    </button>
                    <button
                        onClick={() => {
                            const path = ticket.section === 's2' ? '/s2' : '/tickets';
                            navigate(`${path}?id=${ticket.id}`);
                            toast.dismiss(t.id);
                        }}
                        className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                        Vai al Ticket
                    </button>
                </div>
            </div>
        ), {
            duration: 5000,
            position: 'top-center',
            style: {
                border: '1px solid #6366f1',
                padding: '12px',
            }
        });
    };

    return (
        <TicketNotificationContext.Provider value={{}}>
            {children}
            <Toaster />
        </TicketNotificationContext.Provider>
    );
};

export const useTicketNotifications = () => {
    const context = useContext(TicketNotificationContext);
    if (!context) {
        throw new Error('useTicketNotifications must be used within a TicketNotificationProvider');
    }
    return context;
};
