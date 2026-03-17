const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const config = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official"
};

const run = async () => {
    const app = initializeApp(config, 'check');
    const db = getFirestore(app);

    const snap = await getDocs(collection(db, 'installation_data'));
    console.log(`\nTotale documenti installation_data: ${snap.size}\n`);
    snap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}`);
        console.log(`  toTest=${data.toTest}, tested=${data.tested}, scheduledDate="${data.scheduledDate}", isDeleted=${data.isDeleted}`);
        console.log(`  updatedAt=${data.updatedAt ? new Date(data.updatedAt).toISOString() : 'n/a'}`);
        console.log('');
    });
    process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
