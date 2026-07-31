const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const BASE = 'https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents';

async function fetchAll(url, token) {
    let docs = [];
    let pageToken = null;
    do {
        const fullUrl = pageToken ? `${url}&pageToken=${pageToken}` : url;
        const res = await fetch(fullUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.documents) docs = docs.concat(data.documents);
        pageToken = data.nextPageToken || null;
    } while (pageToken);
    return docs;
}

async function run() {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const accessToken = configData.tokens?.access_token;
        if (!accessToken) { console.error('No access token'); return; }

        // --- TUTTI i 144 activity logs, stampati per intero ---
        console.log('========== TUTTI GLI ACTIVITY LOGS ==========');
        const logs = await fetchAll(`${BASE}/activity_logs?pageSize=300`, accessToken);
        
        logs.forEach((doc, idx) => {
            const f = doc.fields || {};
            const ts      = f.timestamp?.integerValue ?? f.timestamp?.doubleValue ?? 0;
            const date    = ts ? new Date(Number(ts)).toLocaleString('it-IT') : 'N/D';
            const action  = f.action?.stringValue || '';
            const details = f.details?.stringValue || '';
            const op      = f.operatorName?.stringValue || f.userName?.stringValue || '';
            const resId   = f.resourceId?.stringValue || '';
            const resType = f.resourceType?.stringValue || '';
            const meta    = JSON.stringify(f.metadata?.mapValue?.fields || {});
            
            // Cerco tutto quello che contiene SK o articoli
            const combined = (action + details + resId + resType + meta).toUpperCase();
            const hasSK = combined.includes('SK') || combined.includes('INVENTOR') || combined.includes('ARTICOL');
            
            if (hasSK) {
                console.log(`\n  *** TROVATO *** [${idx+1}]`);
                console.log(`    Data:    ${date}`);
                console.log(`    Action:  ${action}`);
                console.log(`    ResType: ${resType}`);
                console.log(`    ResId:   ${resId}`);
                console.log(`    Op:      ${op}`);
                console.log(`    Details: ${details}`);
                console.log(`    Meta:    ${meta}`);
            }
        });

        // --- Cerca in TUTTI i log, stampa anche quelli con "delete" o "remove" ---
        console.log('\n\n========== LOG CON DELETE / REMOVE / CANCELL ==========');
        logs.forEach((doc, idx) => {
            const f = doc.fields || {};
            const ts      = f.timestamp?.integerValue ?? f.timestamp?.doubleValue ?? 0;
            const date    = ts ? new Date(Number(ts)).toLocaleString('it-IT') : 'N/D';
            const action  = f.action?.stringValue || '';
            const details = f.details?.stringValue || '';
            const op      = f.operatorName?.stringValue || f.userName?.stringValue || '';
            const resType = f.resourceType?.stringValue || '';
            const resId   = f.resourceId?.stringValue || '';
            const meta    = JSON.stringify(f.metadata?.mapValue?.fields || {});

            const combined = (action + details + resType + resId + meta).toLowerCase();
            if (combined.includes('delet') || combined.includes('remov') || combined.includes('cancell') || combined.includes('elimina')) {
                console.log(`\n  [${idx+1}] ${date} | ${action} | ${resType} | ${resId} | ${op}`);
                console.log(`    Details: ${details}`);
                if (meta !== '{}') console.log(`    Meta:    ${meta}`);
            }
        });

        // --- Stampa i primi 20 log per capire la struttura ---
        console.log('\n\n========== PRIMI 20 LOG (struttura) ==========');
        logs.slice(0, 20).forEach((doc, idx) => {
            const f = doc.fields || {};
            const ts      = f.timestamp?.integerValue ?? f.timestamp?.doubleValue ?? 0;
            const date    = ts ? new Date(Number(ts)).toLocaleString('it-IT') : 'N/D';
            // Dump ALL fields
            const allFields = Object.keys(f).map(k => {
                const v = f[k];
                const val = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? JSON.stringify(v);
                return `${k}="${val}"`;
            }).join(' | ');
            console.log(`  [${idx+1}] ${date} - ${allFields}`);
        });

        // --- Mostra struttura dei campi unici nei log ---
        console.log('\n\n========== CAMPI UNICI TROVATI NEI LOG ==========');
        const fieldNames = new Set();
        logs.forEach(doc => Object.keys(doc.fields || {}).forEach(k => fieldNames.add(k)));
        fieldNames.forEach(f => console.log(`  - ${f}`));

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
