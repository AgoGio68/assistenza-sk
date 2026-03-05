const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll } = require('firebase/storage');

const oldConfig = {
    apiKey: "AIzaSyD63d5jAcqa8bNkBUxM7FRK7oxeJbIjoXQ",
    authDomain: "assistenza-sk.firebaseapp.com",
    projectId: "assistenza-sk",
    storageBucket: "assistenza-sk.firebasestorage.app" // Prova con .firebasestorage.app
};

const testStorage = async () => {
    console.log("🔍 Test connessione Storage (firebasestorage.app)...");
    try {
        const app = initializeApp(oldConfig);
        const storage = getStorage(app);
        const res = await listAll(ref(storage, '/'));
        console.log("✅ Root listing:");
        res.prefixes.forEach(p => console.log(`  Folder: ${p.fullPath}`));
        res.items.forEach(i => console.log(`  File: ${i.fullPath}`));
    } catch (e) {
        console.error("❌ Errore test:", e.message);
    }
    process.exit();
};

testStorage();
