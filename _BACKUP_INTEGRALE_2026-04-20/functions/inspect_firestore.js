const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'assistenza-sk-official'
    });
}

const db = admin.firestore();

async function inspectFirestore() {
    console.log('--- INIZIO ISPEZIONE FIRESTORE ---');
    const docRef = db.collection('fogli_condivisi').doc('ordini');
    const snap = await docRef.get();
    
    if (!snap.exists) {
        console.log('DOCUMENTO NON TROVATO: fogli_condivisi/ordini');
        return;
    }
    
    const data = snap.data();
    const cellMap = data.data || {};
    const keys = Object.keys(cellMap);
    
    console.log('Documento trovato.');
    console.log('Numero di chiavi nel map "data":', keys.length);
    console.log('Primi 10 tasti:', keys.slice(0, 10));
    
    // Controlliamo riga 1 colonna A (A1)
    console.log('Contenuto A1:', cellMap['A1'] || '(vuoto)');
    
    // Controlliamo riga 28 colonna F (F28)
    console.log('Contenuto F28:', cellMap['F28'] || '(vuoto)');
    
    // Vediamo se ci sono chiavi con prefissi strani o se il map è strutturato male
    const structuralKeys = Object.keys(data).filter(k => k !== 'data');
    console.log('Altre chiavi nel documento:', structuralKeys);
    
    console.log('--- FINE ISPEZIONE ---');
}

inspectFirestore().catch(console.error);
