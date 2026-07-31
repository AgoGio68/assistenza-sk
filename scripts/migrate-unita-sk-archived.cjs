const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

// VITE_FIREBASE_PROJECT_ID="assistenza-sk-official"
const config = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official",
    storageBucket: "assistenza-sk-official.firebasestorage.app",
    messagingSenderId: "666611116958",
    appId: "1:666611116958:web:ffe2e8497796a81ad4c48f"
};

const runMigration = async () => {
    console.log("🚀 Inizio migrazione unità SK (isArchived: false)...");

    const app = initializeApp(config);
    const db = getFirestore(app);

    try {
        console.log("📥 Lettura unità SK...");
        const querySnapshot = await getDocs(collection(db, 'unita_sk'));
        const total = querySnapshot.size;
        console.log(`✅ Trovate ${total} unità in totale.`);

        let count = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const unitDoc of querySnapshot.docs) {
            const data = unitDoc.data();
            const id = unitDoc.id;

            // Se isArchived non è definito (undefined), lo aggiorniamo a false
            if (data.isArchived === undefined) {
                batch.update(doc(db, 'unita_sk', id), { isArchived: false });
                count++;
                batchCount++;

                // Eseguiamo il commit ogni 400 scritture (il limite di Firestore è 500)
                if (batchCount >= 400) {
                    await batch.commit();
                    console.log(`⏳ Commit di ${batchCount} documenti eseguito...`);
                    batch = writeBatch(db);
                    batchCount = 0;
                }
            }
        }

        // Commit finale per i documenti rimanenti
        if (batchCount > 0) {
            await batch.commit();
            console.log(`⏳ Commit finale di ${batchCount} documenti eseguito...`);
        }

        console.log(`\n✨ Migrazione completata con successo! ${count} unità aggiornate con isArchived: false.`);
    } catch (error) {
        console.error("❌ Errore durante la migrazione:", error);
    } finally {
        process.exit();
    }
};

runMigration();
