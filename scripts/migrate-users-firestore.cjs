const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase/firestore');

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

const runProfileMigration = async () => {
    console.log("🚀 Migrazione profili Firestore (users)...");
    const oldApp = initializeApp(oldConfig, 'old_users');
    const newApp = initializeApp(newConfig, 'new_users');
    const oldDb = getFirestore(oldApp);
    const newDb = getFirestore(newApp);

    try {
        const querySnapshot = await getDocs(collection(oldDb, 'users'));
        console.log(`✅ Trovati ${querySnapshot.size} profili.`);

        for (const userDoc of querySnapshot.docs) {
            await setDoc(doc(newDb, 'users', userDoc.id), userDoc.data());
            console.log(`Migrato profilo: ${userDoc.data().email}`);
        }
        console.log("✨ Migrazione profili completata.");
    } catch (error) {
        console.error("❌ Errore:", error);
    } finally {
        process.exit();
    }
};

runProfileMigration();
