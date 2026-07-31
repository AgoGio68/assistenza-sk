const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Carica il service account o usa le credenziali dell'ambiente
// Poiché siamo sul desktop dell'utente, speriamo che firebase-admin possa usare le credenziali ADC
// Altrimenti proviamo a indovinare il progetto
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = pkg.version;

process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.FIREBASE_CONFIG_PATH || ''; // Se l'utente ha impostato qualcosa

try {
    const app = initializeApp({
        projectId: 'assistenza-sk-official'
    });
    const db = getFirestore(app);

    async function updateVersion() {
        console.log('Aggiornamento versione in Firestore a:', version);
        const docRef = db.collection('settings').doc('global');
        await docRef.set({ version: version }, { merge: true });
        console.log('Versione aggiornata con successo!');
        process.exit(0);
    }

    updateVersion().catch(err => {
        console.error('Errore durante l\'aggiornamento:', err);
        process.exit(1);
    });
} catch (e) {
    console.error('Impossibile inizializzare Firebase Admin:', e.message);
    process.exit(1);
}
