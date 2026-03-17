const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const config = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official"
};

const run = async () => {
    const app = initializeApp(config, 'inspect');
    const db = getFirestore(app);

    const snap = await getDocs(collection(db, 'installation_data'));

    const milaniDocs = [];
    snap.forEach(d => {
        if (d.id.toLowerCase().includes('milani')) {
            milaniDocs.push({ id: d.id, data: d.data() });
        }
    });

    console.log(`\nDocumenti Milani trovati: ${milaniDocs.length}\n`);
    milaniDocs.forEach(d => {
        console.log(`=== ID: ${d.id} ===`);
        console.log(JSON.stringify(d.data, null, 2));
        console.log('');
    });

    // Elimina TUTTI i documenti Milani
    console.log('\nEliminazione di tutti i documenti Milani...');
    for (const d of milaniDocs) {
        await deleteDoc(doc(db, 'installation_data', d.id));
        console.log(`✅ Eliminato: ${d.id}`);
    }
    console.log('\n🎉 Reset completato! Ricarica l\'app e reimposta lo stato.');
    process.exit(0);
};

run().catch(e => { console.error('Errore:', e); process.exit(1); });
