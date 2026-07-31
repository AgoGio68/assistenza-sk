/**
 * cleanup_and_init_guests.mjs
 * 
 * 1. Elimina i record utente senza email (ghost records).
 * 2. Inizializza 5 record "Ospite" nella collezione users per l'accesso pubblico.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs, doc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

/* ─── Firebase config ─── */
const firebaseConfig = {
    apiKey:     'AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA',
    authDomain: 'assistenza-sk-official.firebaseapp.com',
    projectId:  'assistenza-sk-official',
    appId:      '1:666611116958:web:ffe2e8497796a81ad4c48f',
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

async function run() {
    try {
        // Auth non necessaria con le regole rilassate temporaneamente
        // 1. PULIZIA GHOST RECORDS
        console.log('🔍 Scansione utenti per record incompleti...');
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        let deletedCount = 0;
        for (const userDoc of snapshot.docs) {
            const data = userDoc.data();
            // Eliminiamo se email è null, undefined o stringa vuota
            // E non è uno dei nostri nuovi guest "guest_X"
            if ((!data.email || data.email.trim() === '') && !userDoc.id.startsWith('anonimo_')) {
                console.log(`🗑️  Elimino ghost record: ${userDoc.id} (${data.displayName || 'Senza nome'})`);
                await deleteDoc(doc(db, 'users', userDoc.id));
                deletedCount++;
            }
        }
        console.log(`✅ Pulizia completata: ${deletedCount} record rimossi.`);

        // 2. INIZIALIZZAZIONE 5 GUEST SLOTS
        console.log('🆕 Inizializzazione 5 slot Anonimi...');
        for (let i = 1; i <= 5; i++) {
            const guestId = `anonimo_${i}`;
            const guestDoc = {
                uid: guestId,
                displayName: `Ospite ${i}`,
                email: `anonimo${i}@assistenza-sk.it`, // Email fittizia per validazione
                role: 'user',
                status: 'approved',
                isGuest: true,
                createdAt: Date.now()
            };
            await setDoc(doc(db, 'users', guestId), guestDoc);
            console.log(`   + Creato: ${guestDoc.displayName}`);
        }
        console.log('✅ Inizializzazione Slot completata.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Errore durante la manutenzione:', err);
        process.exit(1);
    }
}

run();
