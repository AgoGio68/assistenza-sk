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

        // --- 1. Current inventory ---
        console.log('\n========== ARTICOLI ATTUALI IN MAGAZZINO ==========');
        const currentItems = await fetchAll(`${BASE}/inventory?pageSize=200`, accessToken);
        const currentIds = new Set();
        const currentByName = new Map();
        currentItems.forEach((doc, idx) => {
            const f = doc.fields || {};
            const id = doc.name.split('/').pop();
            const name = f.name?.stringValue || '(N/A)';
            const code = f.code?.stringValue || '(N/A)';
            const stock = f.stock?.integerValue ?? f.stock?.doubleValue ?? '?';
            const minT  = f.minThreshold?.integerValue ?? f.minThreshold?.doubleValue ?? '?';
            const unit  = f.unit?.stringValue || '';
            currentIds.add(id);
            currentByName.set(id, name);
            console.log(`  [${idx+1}] "${name}" | Codice: ${code} | Stock: ${stock} | Min: ${minT} | Unità: ${unit} | ID: ${id}`);
        });
        console.log(`  TOTALE ATTUALI: ${currentItems.length}`);

        // --- 2. All item IDs/names ever seen in movements ---
        console.log('\n========== MOVIMENTI STORICI (inventory_movements) ==========');
        const movements = await fetchAll(`${BASE}/inventory_movements?pageSize=300`, accessToken);
        
        // Build a map of itemId -> { name, count, types }
        const seenItems = new Map(); // itemId -> { names: Set, movements: [] }
        
        movements.forEach((doc, idx) => {
            const f = doc.fields || {};
            const itemId   = f.itemId?.stringValue || '(N/A)';
            const itemName = f.itemName?.stringValue || '(N/A)';
            const type     = f.type?.stringValue || '?';
            const qty      = f.quantity?.integerValue ?? f.quantity?.doubleValue ?? 0;
            const ts       = f.timestamp?.integerValue ?? f.timestamp?.doubleValue ?? 0;
            const date     = ts ? new Date(Number(ts)).toLocaleString('it-IT') : 'N/D';
            const operator = f.operatorName?.stringValue || '?';
            const reason   = f.reason?.stringValue || '';

            if (!seenItems.has(itemId)) seenItems.set(itemId, { names: new Set(), movements: [] });
            seenItems.get(itemId).names.add(itemName);
            seenItems.get(itemId).movements.push({ date, type, qty, operator, reason });
            
            console.log(`  [${idx+1}] ${date} | ${type.toUpperCase()} ${qty} | "${itemName}" (ID: ${itemId}) | ${operator}${reason ? ' | ' + reason : ''}`);
        });
        console.log(`  TOTALE MOVIMENTI: ${movements.length}`);

        // --- 3. Items referenced in movements but NOT in current inventory ---
        console.log('\n========== ARTICOLI SPARITI (in movimenti ma non più in magazzino) ==========');
        let missingCount = 0;
        seenItems.forEach((info, itemId) => {
            if (!currentIds.has(itemId)) {
                missingCount++;
                const names = Array.from(info.names).join(' / ');
                const movCount = info.movements.length;
                const firstMov = info.movements[0]?.date || '?';
                const lastMov  = info.movements[info.movements.length - 1]?.date || '?';
                console.log(`  ⚠️  ID: ${itemId}`);
                console.log(`      Nome: "${names}"`);
                console.log(`      Movimenti: ${movCount} (primo: ${firstMov} | ultimo: ${lastMov})`);
                info.movements.forEach(m => {
                    console.log(`        - ${m.date} | ${m.type.toUpperCase()} ${m.qty} | Op: ${m.operator}${m.reason ? ' | ' + m.reason : ''}`);
                });
            }
        });
        if (missingCount === 0) {
            console.log('  Nessun articolo mancante trovato nei movimenti.');
        } else {
            console.log(`\n  TOTALE ARTICOLI SPARITI: ${missingCount}`);
        }

        // --- 4. Activity logs filtered for inventory ---
        console.log('\n========== ACTIVITY LOGS RELATIVI AL MAGAZZINO ==========');
        const logs = await fetchAll(`${BASE}/activity_logs?pageSize=300`, accessToken);
        const inventoryLogs = logs.filter(doc => {
            const f = doc.fields || {};
            const cat     = (f.category?.stringValue || '').toLowerCase();
            const action  = (f.action?.stringValue || '').toLowerCase();
            const details = (f.details?.stringValue || '').toLowerCase();
            return cat.includes('inventor') || action.includes('inventor') || action.includes('delete') && details.includes('inventor');
        });
        
        if (inventoryLogs.length === 0) {
            console.log('  Nessun log di attività relativo al magazzino trovato.');
            console.log(`  (Totale log esaminati: ${logs.length})`);
        } else {
            inventoryLogs.forEach((doc, idx) => {
                const f = doc.fields || {};
                const ts   = f.timestamp?.integerValue ?? f.timestamp?.doubleValue ?? 0;
                const date = ts ? new Date(Number(ts)).toLocaleString('it-IT') : 'N/D';
                const cat  = f.category?.stringValue || '';
                const act  = f.action?.stringValue || '';
                const op   = f.operatorName?.stringValue || '';
                const det  = f.details?.stringValue || '';
                console.log(`  [${idx+1}] ${date} | ${cat} | ${act} | ${op} | ${det}`);
            });
        }

        // --- 5. List ALL activity log categories (to see what's available) ---
        console.log('\n========== TUTTE LE CATEGORIE NEI ACTIVITY LOGS ==========');
        const cats = new Set();
        logs.forEach(doc => {
            const cat = doc.fields?.category?.stringValue || '(nessuna)';
            cats.add(cat);
        });
        cats.forEach(c => console.log(`  - ${c}`));
        console.log(`  (Totale log: ${logs.length})`);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
