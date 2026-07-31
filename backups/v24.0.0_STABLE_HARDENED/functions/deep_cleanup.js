const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'assistenza-sk-official'
    });
}

const db = admin.firestore();

async function deepCleanup() {
    console.log('--- DEEP CLEANUP START ---');
    const docRef = db.collection('fogli_condivisi').doc('ordini');
    
    // 1. Azzeriamo i commenti
    await docRef.update({ comments: {} });
    console.log('Commenti (triangolini rossi) azzerati.');

    // 2. Opzionale: pulizia scritte di test nelle celle (es. FIREBASE_CHECK)
    const snap = await docRef.get();
    if (snap.exists()) {
        const data = snap.data().data || {};
        const updatedData = { ...data };
        let changed = false;
        
        for (const [key, val] of Object.entries(updatedData)) {
            if (String(val).includes('FIREBASE_CHECK') || String(val).includes('test model')) {
                delete updatedData[key];
                changed = true;
            }
        }
        
        if (changed) {
            await docRef.update({ data: updatedData });
            console.log('Celle di test pulite.');
        }
    }
    
    console.log('--- DEEP CLEANUP END ---');
}

deepCleanup().catch(console.error);
