const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'assistenza-sk-official'
    });
}

const db = admin.firestore();

async function cleanupData() {
    console.log('--- CLEANUP DATA START ---');
    const docRef = db.collection('fogli_condivisi').doc('ordini');
    const snap = await docRef.get();
    
    if (!snap.exists) return;
    
    const data = snap.data().data || {};
    const updatedData = { ...data };
    let changed = false;

    // Rimuoviamo i test del bot se presenti
    const suspiciousValues = ['FIREBASE_CHECK_123', 'TEST NOTA', '... TEST NOTA'];
    
    for (const [key, val] of Object.entries(updatedData)) {
        if (suspiciousValues.includes(String(val))) {
            console.log(`Rilevato valore sospetto in ${key}: "${val}". Rimozione in corso...`);
            delete updatedData[key];
            changed = true;
        }
    }

    if (changed) {
        await docRef.update({ data: updatedData });
        console.log('Dati puliti con successo.');
    } else {
        console.log('Nessun valore sospetto trovato.');
    }
    console.log('--- CLEANUP DATA END ---');
}

cleanupData().catch(console.error);
