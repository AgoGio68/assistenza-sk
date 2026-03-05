const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase/firestore');

// VECCHIO PROGETTO (dati da .env)
const oldConfig = {
    apiKey: "AIzaSyD63d5jAcqa8bNkBUxM7FRK7oxeJbIjoXQ",
    authDomain: "assistenza-sk.firebaseapp.com",
    projectId: "assistenza-sk",
    storageBucket: "assistenza-sk.firebasestorage.app",
    messagingSenderId: "517535290337",
    appId: "1:517535290337:web:95471674a52d3a4ae878a0"
};

// NUOVO PROGETTO
const newConfig = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official",
    storageBucket: "assistenza-sk-official.firebasestorage.app",
    messagingSenderId: "666611116958",
    appId: "1:666611116958:web:ffe2e8497796a81ad4c48f"
};

const runMigration = async () => {
    console.log("🚀 Inizio migrazione ticket...");

    // Inizializza le due app
    const oldApp = initializeApp(oldConfig, 'old');
    const newApp = initializeApp(newConfig, 'new');

    const oldDb = getFirestore(oldApp);
    const newDb = getFirestore(newApp);

    try {
        console.log("📥 Lettura ticket dal vecchio progetto...");
        const querySnapshot = await getDocs(collection(oldDb, 'tickets'));
        const total = querySnapshot.size;
        console.log(`✅ Trovati ${total} ticket.`);

        let count = 0;
        for (const ticketDoc of querySnapshot.docs) {
            const data = ticketDoc.data();
            const id = ticketDoc.id;

            // Scrivi nel nuovo progetto
            await setDoc(doc(newDb, 'tickets', id), data);
            count++;
            if (count % 5 === 0) console.log(`⏳ Progresso: ${count}/${total}...`);
        }

        console.log(`\n✨ Migrazione completata con successo! ${count} ticket trasferiti.`);
    } catch (error) {
        console.error("❌ Errore durante la migrazione:", error);
    } finally {
        process.exit();
    }
};

runMigration();
