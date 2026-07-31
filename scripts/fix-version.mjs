// Script one-shot per allineare la versione Firestore al client 4.4.0
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA',
    authDomain: 'assistenza-sk-official.firebaseapp.com',
    projectId: 'assistenza-sk-official',
    appId: '1:666611116958:web:ffe2e8497796a81ad4c48f',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

try {
    await setDoc(doc(db, 'settings', 'global'), { version: '4.4.0' }, { merge: true });
    console.log('✅ versione Firestore aggiornata → 4.4.0');
} catch (e) {
    console.error('❌', e);
} finally {
    process.exit(0);
}
