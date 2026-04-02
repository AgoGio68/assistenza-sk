import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityLog } from '../types';

const ACTIVITY_LOGS_COLLECTION = 'activity_logs';

export const AuditLogService = {
    /**
     * Registra una nuova azione nell'Audit Log globale
     */
    async logAction(logEntry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
                ...logEntry,
                timestamp: Date.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Errore durante la scrittura del log:', error);
            // Non solleviamo l'eccezione per evitare di bloccare l'azione principale dell'utente
            return '';
        }
    },

    /**
     * Recupera gli ultimi N log (default 200)
     */
    async fetchLogs(limitCount: number = 200): Promise<ActivityLog[]> {
        try {
            const q = query(
                collection(db, ACTIVITY_LOGS_COLLECTION),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ActivityLog);
        } catch (error) {
            console.error('Errore durante il recupero dei log:', error);
            return [];
        }
    }
};
