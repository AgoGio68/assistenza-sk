const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'assistenza-sk-official'
    });
}

const db = admin.firestore();

async function checkComments() {
    console.log('--- START CHECKING COMMENTS ---');
    const docRef = db.collection('fogli_condivisi').doc('ordini');
    const snap = await docRef.get();
    
    if (!snap.exists) {
        console.log('Document not found');
        return;
    }
    
    const data = snap.data();
    console.log('Documento trovato.');
    
    const comments = data.comments || {};
    const commentKeys = Object.keys(comments);
    
    console.log(`Trovati ${commentKeys.length} commenti (note di cella).`);
    
    for (const k of commentKeys.slice(0, 5)) {
        console.log(`${k}: ${comments[k]}`);
    }

    console.log('--- END CHECKING COMMENTS ---');
}

checkComments().catch(console.error);
