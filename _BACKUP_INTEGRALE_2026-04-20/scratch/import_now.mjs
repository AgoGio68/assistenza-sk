import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
    apiKey: 'AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA',
    authDomain: 'assistenza-sk-official.firebaseapp.com',
    projectId: 'assistenza-sk-official',
    appId: '1:666611116958:web:ffe2e8497796a81ad4c48f',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// Helpers
function colLetter(c) {
    let s = '', n = c;
    while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
    return s;
}
function cellName(c, r) { return colLetter(c) + (r + 1); }

const csvPath = 'c:/assistenza-sk/scratch/input_ordini_v2.csv';
console.log(`📄 Caricamento CSV da: ${csvPath}`);
const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));

const dataMap = {};
lines.forEach((line, rowIndex) => {
    if (!line.trim() || rowIndex === 0) return;
    const cells = line.split(',');
    cells.forEach((cell, colIndex) => {
        const val = cell.trim();
        if (val !== '') {
            dataMap[cellName(colIndex, rowIndex)] = val;
        }
    });
});

console.log(`Celle da importare: ${Object.keys(dataMap).length}`);

// Header style
const styleMap = {};
for (let c = 0; c <= 10; c++) {
    styleMap[cellName(c, 0)] = 'font-weight: bold; background-color: #1e3a5f; color: #ffffff;';
}

// Tentativo di Auth (opzionale dato che rules sono allow write: if true)
try {
    await signInAnonymously(auth);
    console.log('Auth anonima OK');
} catch (e) {
    console.warn('⚠️ Auth anonima fallita (ma procedo lo stesso):', e.code || e.message);
}

// Scrittura Firestore
try {
    const docRef = doc(db, 'fogli_condivisi', 'ordini');
    await setDoc(docRef, {
        data: dataMap,
        style: styleMap,
        comments: {},
    }, { merge: false });
    console.log(`✅ Importazione completata! ${Object.keys(dataMap).length} celle scritte.`);
} catch (e) {
    console.error('❌ Errore durante la scrittura su Firestore:', e);
}

// Forza l'uscita per evitare hang di Firebase
setTimeout(() => {
    process.exit(0);
}, 2000);
