const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const config = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official"
};

const run = async () => {
    const app = initializeApp(config);
    const db = getFirestore(app);

    const snap = await getDocs(collection(db, 'installation_data'));
    console.log(`Trovati ${snap.size} documenti totali in installation_data.`);

    const toDelete = [];
    snap.forEach(d => {
        const id = d.id.toLowerCase();
        if (id.includes('milani') && id.includes('653')) {
            toDelete.push(d.id);
        }
    });

    if (toDelete.length === 0) {
        console.log('Nessun documento trovato per Milani+653. Stampo TUTTI gli ID per controllo:');
        snap.forEach(d => console.log(' -', d.id));
        process.exit(0);
    }

    console.log(`\nDocumenti da eliminare (${toDelete.length}):`);
    toDelete.forEach(id => console.log(' -', id));

    for (const id of toDelete) {
        await deleteDoc(doc(db, 'installation_data', id));
        console.log(`✅ Eliminato: ${id}`);
    }

    console.log('\n🎉 Reset completato! Ricarica l\'app e imposta "Collaudata".');
    process.exit(0);
};

run().catch(e => { console.error('Errore:', e); process.exit(1); });
