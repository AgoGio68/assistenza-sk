const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'assistenza-sk-official'
    });
}

const db = admin.firestore();

async function checkLiveNote() {
    console.log('CHECK_START');
    const docRef = db.collection('fogli_condivisi').doc('ordini');
    const snap = await docRef.get();
    
    if (!snap.exists) {
        console.log('Document not found');
        return;
    }
    
    const data = snap.data().data || {};
    // La colonna "Ordine" è la A. La riga 1 è la 1.
    const note = data['A1'] || '(cella vuota)';
    
    console.log('--- TEST LIVE ---');
    console.log('Valore in A1:', note);
    console.log('-----------------');
    console.log('CHECK_END');
}

checkLiveNote().catch(console.error);
