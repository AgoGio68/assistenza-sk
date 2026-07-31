const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Attempting to use the same logic as the migration/update scripts
try {
    const app = initializeApp({
        projectId: 'assistenza-sk-official'
    });
    const db = getFirestore(app);

    async function getRow28Note() {
        console.log('Fetching sheet data from Firestore...');
        const docRef = db.collection('fogli_condivisi').doc('ordini');
        const snap = await docRef.get();
        
        if (!snap.exists) {
            console.log('Document fogli_condivisi/ordini not found.');
            return;
        }

        const data = snap.data().data || {};
        const cellF28 = data['F28'] || 'VUOTA';
        
        console.log('--- CONTENUTO CELLA F28 (Modello Sk riga 28) ---');
        console.log(cellF28);
        console.log('------------------------------------------------');
    }

    getRow28Note().catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
} catch (e) {
    console.error('Initialization error:', e.message);
    process.exit(1);
}
