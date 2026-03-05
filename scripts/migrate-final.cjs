const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc, getDoc } = require('firebase/firestore');

const oldConfig = {
    apiKey: "AIzaSyD63d5jAcqa8bNkBUxM7FRK7oxeJbIjoXQ",
    authDomain: "assistenza-sk.firebaseapp.com",
    projectId: "assistenza-sk"
};

const newConfig = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official"
};

const runFinalMigration = async () => {
    console.log("🚀 Migrazione Impostazioni e Note Installazioni...");
    const oldApp = initializeApp(oldConfig, 'old_final');
    const newApp = initializeApp(newConfig, 'new_final');
    const oldDb = getFirestore(oldApp);
    const newDb = getFirestore(newApp);

    try {
        // 1. Migrazione Impostazioni Globali
        console.log("⚙️ Trasferimento Impostazioni Globali...");
        const settingsDoc = await getDoc(doc(oldDb, 'settings', 'global'));
        if (settingsDoc.exists()) {
            await setDoc(doc(newDb, 'settings', 'global'), settingsDoc.data());
            console.log("✅ Impostazioni globali migrate.");
        }

        // 2. Migrazione Note Installazioni (installation_data)
        console.log("📝 Trasferimento Note Installazioni...");
        const installSnap = await getDocs(collection(oldDb, 'installation_data'));
        console.log(`✅ Trovati ${installSnap.size} documenti di note.`);

        for (const iDoc of installSnap.docs) {
            await setDoc(doc(newDb, 'installation_data', iDoc.id), iDoc.data());
        }
        console.log("✨ Migrazione dati completata.");

    } catch (error) {
        console.error("❌ Errore:", error);
    } finally {
        process.exit();
    }
};

runFinalMigration();
