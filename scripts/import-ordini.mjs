/**
 * import-ordini.mjs  —  v3.0  (Refactoring "zero-glitch")
 *
 * Funzionamento:
 *  1. Wipe totale del documento fogli_condivisi/ordini su Firestore.
 *  2. Legge il CSV più recente "SK ISTALLAZIONI - ORDINI*.csv" da Downloads/
 *     oppure il path passato come argomento CLI: `node import-ordini.mjs /path/to/file.csv`
 *  3. Salta la riga 0 (intestazione CSV).
 *  4. Parsa correttamente i campi: gestisce virgole interne a campi quotati.
 *  5. Mappa le 11 colonne CSV (0..10) sull'indirizzamento cella A1-K<n>.
 *     La colonna 11 (P — priorità nascosta) NON viene scritta: viene ricalcolata
 *     lato client da prepareSortedData() in SharedSheet.tsx.
 *  6. Scrive su Firestore in un singolo setDoc (payload < 1 MB, nessun batch necessario
 *     per questa struttura a documento singolo). Aggiunge stili header.
 *  7. Resetta structureVersion a 0 per forzare il full-reload su tutti i client aperti.
 *
 * Mapping CSV → Colonna Jspreadsheet:
 *   CSV col 0  → A  : Ordine
 *   CSV col 1  → B  : Cliente
 *   CSV col 2  → C  : Macchina
 *   CSV col 3  → D  : Installazione
 *   CSV col 4  → E  : Data (label UI: "Data Cons.")
 *   CSV col 5  → F  : Modello SK
 *   CSV col 6  → G  : Matricola SK
 *   CSV col 7  → H  : Data Install. (label UI: "Data Inst.")
 *   CSV col 8  → I  : Commenti
 *   CSV col 9  → J  : Note Installazioni
 *   CSV col 10 → K  : Note Amministrazione
 *   col 11 (L) → P  : Priorità nascosta (ricalcolata lato client, NON importata)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ─── Firebase config ─── */
const firebaseConfig = {
    apiKey:     'AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA',
    authDomain: 'assistenza-sk-official.firebaseapp.com',
    projectId:  'assistenza-sk-official',
    appId:      '1:666611116958:web:ffe2e8497796a81ad4c48f',
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ─── Helpers coordinate ─── */
function colLetter(c) {
    let s = '', n = c;
    while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
    return s;
}
function cellName(c, r) { return colLetter(c) + (r + 1); }

/* ─── Parser CSV robusto ─────────────────────────────────────────────────
   Gestisce:
   • campi racchiusi tra virgolette con virgole interne
   • sequenze \"\" come escape di una virgolette all'interno di un campo
   • trailing \r (Windows line endings)
─────────────────────────────────────────────────────────────────────── */
function parseCSVLine(line) {
    const fields = [];
    let field = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (ch === ',' && !insideQuotes) {
            fields.push(field);
            field = '';
        } else {
            field += ch;
        }
    }
    fields.push(field); // ultimo campo
    return fields;
}

/* ─── Selezione CSV ─── */
let csvPath;
if (process.argv[2]) {
    csvPath = path.resolve(process.argv[2]);
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ File non trovato: ${csvPath}`);
        process.exit(1);
    }
    console.log(`📄 CSV da argomento CLI: ${csvPath}`);
} else {
    const downloadsDir = 'C:/Users/gagos/Downloads';
    const candidates = fs.readdirSync(downloadsDir)
        .filter(f => f.startsWith('SK ISTALLAZIONI - ORDINI') && f.endsWith('.csv'))
        .map(f => ({ name: f, mtime: fs.statSync(`${downloadsDir}/${f}`).mtime }))
        .sort((a, b) => b.mtime - a.mtime);

    if (candidates.length === 0) {
        console.error('❌ Nessun CSV "SK ISTALLAZIONI - ORDINI*.csv" trovato in C:/Users/gagos/Downloads/');
        process.exit(1);
    }
    csvPath = `${downloadsDir}/${candidates[0].name}`;
    console.log(`📄 CSV selezionato (più recente): ${candidates[0].name}  [${candidates[0].mtime.toLocaleString()}]`);
}

/* ─── Leggi e parsa CSV ─── */
const raw   = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));

// Riga 0 = intestazioni CSV (es. "Ordine,Cliente,Macchina,...") → saltata
const headerLine = lines[0];
console.log(`ℹ️  Intestazioni CSV rilevate: ${headerLine}`);
console.log(`ℹ️  Righe dati trovate: ${lines.slice(1).filter(l => l.trim()).length}`);

/* ─── Costruisci array di righe grezze ─────────────────────────────────────
   Ogni riga CSV diventa un array di 11 celle (colonne 0..10).
─────────────────────────────────────────────────────────────────────────── */
const NUM_DATA_COLS = 11; // colonne 0..10 (A..K)

const rawRows = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseCSVLine(line);
    const row = [];
    for (let colIndex = 0; colIndex < NUM_DATA_COLS; colIndex++) {
        row.push((cells[colIndex] ?? '').trim());
    }
    rawRows.push(row);
}

/* ─── Sort righe: Attive → FT → Vuote ───────────────────────────────────────
   Replica la stessa logica di sortRows() in SharedSheet.tsx.
   Garantisce che Firebase riceva i dati già nell'ordine corretto.
─────────────────────────────────────────────────────────────────────────── */
function rowPriority(row) {
    const dataCons = String(row[4] || '').toUpperCase();
    const orderCol = String(row[0] || '').trim();
    if (orderCol === '' && dataCons === '') return 2; // vuota
    if (dataCons.includes('FT'))            return 1; // fatturata
    return 0;                                          // attiva
}

const dataRows  = rawRows.filter(r => rowPriority(r) < 2);
const emptyRows = rawRows.filter(r => rowPriority(r) === 2);
dataRows.sort((a, b) => rowPriority(a) - rowPriority(b));
const sortedRows = [...dataRows, ...emptyRows];

console.log(`ℹ️  Righe attive: ${dataRows.filter(r => rowPriority(r) === 0).length}`);
console.log(`ℹ️  Righe FT:     ${dataRows.filter(r => rowPriority(r) === 1).length}`);
console.log(`ℹ️  Righe vuote:  ${emptyRows.length}`);

/* ─── Costruisci mappa { "A1": "val", ... } ─── */
const dataMap = {};
sortedRows.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < NUM_DATA_COLS; colIndex++) {
        const val = row[colIndex];
        if (val !== '') dataMap[cellName(colIndex, rowIndex)] = val;
    }
});

console.log(`ℹ️  Righe elaborate: ${sortedRows.length}`);

/* ─── Stile header vuoto (nessuna riga di header nei dati) ─── */
// Lo spreadsheet non ha una riga di intestazione come dato.
// Gli header sono definiti solo tramite COLUMNS in SharedSheet.tsx.
// Quindi NON applichiamo stili a riga 0.
const styleMap = {};

/* ─── Auth anonima ─── */
try {
    await signInAnonymously(auth);
    console.log('✅ Auth anonima OK');
} catch (e) {
    console.warn('⚠️  Auth anonima fallita, provo comunque:', e.code);
}

/* ─── WIPE + WRITE su Firestore ─────────────────────────────────────
   Usiamo merge:false per sovrascrivere completamente il documento.
   structureVersion viene resettato a 1 per forzare un full-reload
   su tutti i client Jspreadsheet aperti (onSnapshot rileverà che
   remoteStructVer !== localStructVersion e chiamerà loadData()).
─────────────────────────────────────────────────────────────────────── */
const docRef = doc(db, 'fogli_condivisi', 'ordini');

console.log('🗑️  Wipe + scrittura su Firestore...');
await setDoc(docRef, {
    data:             dataMap,
    style:            styleMap,
    comments:         {},
    structureVersion: 1,   // forza full-reload sui client aperti
}, { merge: false }); // merge:false = wipe completo

console.log(`✅ Importazione completata! ${sortedRows.length} righe (${dataRows.filter(r => rowPriority(r) === 0).length} attive + ${dataRows.filter(r => rowPriority(r) === 1).length} FT), ${Object.keys(dataMap).length} celle scritte.`);
console.log('ℹ️  I client aperti riceveranno il full-reload via onSnapshot automaticamente.');
process.exit(0);
