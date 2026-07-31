import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

const GUEST_KEY = 'sk_guest_identity';

/**
 * GuestService gestisce l'assegnazione di identità temporanee per utenti non loggati.
 * Utilizza un pool di 5 slot pre-definiti (anonimo_1 ... anonimo_5) per evitare
 * la proliferazione di record "fantasma" nel database.
 */
export const GuestService = {
    getOrAssignGuestIdentity: async (): Promise<UserProfile> => {
        // Controlla se abbiamo già un'identità in questa sessione
        const cached = sessionStorage.getItem(GUEST_KEY);
        let guestId = cached;

        if (!guestId) {
            // Assegna uno slot casuale da 1 a 5
            const slot = Math.floor(Math.random() * 5) + 1;
            guestId = `anonimo_${slot}`;
            sessionStorage.setItem(GUEST_KEY, guestId);
        }

        try {
            // Tenta di recuperare il profilo reale configurato nel DB
            const guestDoc = await getDoc(doc(db, 'users', guestId));
            if (guestDoc.exists()) {
                return guestDoc.data() as UserProfile;
            }
        } catch (error) {
            // Log silenziato in produzione per evitare confusione se il record non esiste
            console.log('[GuestService] Profilo ospite non trovato nel DB, utilizzo fallback locale.');
        }

        // Fallback in caso di problemi di rete o record non trovato
        return {
            uid: guestId,
            displayName: `Ospite ${guestId.split('_')[1]}`,
            role: 'user',
            status: 'approved',
            createdAt: Date.now(),
            email: `anonimo${guestId.split('_')[1]}@assistenza-sk.it`
        } as UserProfile;
    }
};
