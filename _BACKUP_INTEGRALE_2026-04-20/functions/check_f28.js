const admin = require('firebase-admin');

// No need for cert if running on a machine with default credentials or just projectId
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'assistenza-sk-official'
    });
}

const db = admin.firestore();

async function check() {
    const docRef = db.collection('fogli_condivisi').doc('ordini');
    const snap = await docRef.get();
    if (!snap.exists) {
        console.log('Document not found');
        return;
    }
    const data = snap.data().data || {};
    console.log('VALUE_START');
    console.log(data['F28'] || '(vuota)');
    console.log('VALUE_END');
}

check().catch(console.error);
