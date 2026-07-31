const fs = require('fs');
const os = require('os');
const configPath = require('path').join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const BASE = 'https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents';

const LEVELDB = 'C:\\Users\\gagos\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\https_assistenza-sk-official.web.app_0.indexeddb.leveldb';

function extractStrings(filePath) {
    const buf = fs.readFileSync(filePath);
    let current = '';
    const found = new Set();
    for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        if (c >= 32 && c <= 126) {
            current += String.fromCharCode(c);
        } else {
            if (current.length >= 5) found.add(current.trim());
            current = '';
        }
    }
    if (current.length >= 5) found.add(current.trim());
    return Array.from(found);
}

async function fetchAll(url, token) {
    let docs = []; let pt = null;
    do {
        const u = pt ? url + '&pageToken=' + pt : url;
        const r = await fetch(u, { headers: { 'Authorization': 'Bearer ' + token } });
        const d = await r.json();
        if (d.documents) docs = docs.concat(d.documents);
        pt = d.nextPageToken || null;
    } while (pt);
    return docs;
}

async function run() {
    const token = JSON.parse(fs.readFileSync(configPath, 'utf8')).tokens?.access_token;

    // === 1. Leggi cache Chrome attuale ===
    console.log('=== CACHE CHROME (file attuali) ===');
    const files = fs.readdirSync(LEVELDB);
    console.log('File presenti:', files.join(', '));
    
    const allStrings = new Set();
    files.forEach(fname => {
        if (fname === 'LOCK' || fname === 'CURRENT') return;
        const fp = LEVELDB + '\\' + fname;
        try {
            const strs = extractStrings(fp);
            strs.forEach(s => allStrings.add(s));
            console.log(`  ${fname}: ${strs.length} stringhe estratte`);
        } catch(e) {
            console.log(`  ${fname}: ERRORE - ${e.message}`);
        }
    });

    const all = Array.from(allStrings);
    console.log('Totale stringhe uniche:', all.length);

    // Cerca SK4.10-O26SH
    console.log('\n=== STRINGHE SK4.10-O26SH NELLA CACHE ===');
    const skHits = all.filter(s => /SK4\.10|SK5\.12|O26SH|O25SH|inventory/i.test(s));
    if (skHits.length === 0) console.log('  (nessuna trovata)');
    skHits.forEach(s => console.log('  >> ' + s.substring(0, 300)));

    // === 2. Dump completo unita_sk con TUTTI i campi ===
    console.log('\n=== UNITA_SK — TUTTI I CAMPI ===');
    const unitaSk = await fetchAll(BASE + '/unita_sk?pageSize=200', token);
    unitaSk.forEach((doc, i) => {
        const f = doc.fields || {};
        const id = doc.name.split('/').pop();
        console.log(`\n  [${i+1}] ID: ${id}`);
        Object.keys(f).sort().forEach(k => {
            const v = f[k];
            const val = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? v.timestampValue ?? JSON.stringify(v).substring(0, 100);
            console.log(`    ${k}: ${val}`);
        });
    });

    // === 3. Cerca in inventory per documenti con "SK" nel nome ===
    console.log('\n=== INVENTORY — RICERCA ESTESA (tutti i campi) ===');
    const inv = await fetchAll(BASE + '/inventory?pageSize=200', token);
    inv.forEach((doc, i) => {
        const f = doc.fields || {};
        const id = doc.name.split('/').pop();
        console.log(`\n  [${i+1}] ID: ${id}`);
        Object.keys(f).sort().forEach(k => {
            const v = f[k];
            const val = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? v.timestampValue ?? JSON.stringify(v).substring(0, 100);
            console.log(`    ${k}: ${val}`);
        });
    });

    // === 4. Query Firestore: cerca documenti con nome che contiene "SK" ===
    console.log('\n=== QUERY FIRESTORE: documenti inventory con "SK" nel nome ===');
    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'inventory' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'name' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { stringValue: 'SK' }
                }
            },
            limit: 100
        }
    };
    const qRes = await fetch(
        'https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents:runQuery',
        {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(queryBody)
        }
    );
    const qData = await qRes.json();
    console.log('Risultati query SK:', JSON.stringify(qData).substring(0, 500));
}

run().catch(console.error);
