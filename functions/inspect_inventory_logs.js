const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

async function run() {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const accessToken = configData.tokens?.access_token;
        if (!accessToken) {
            console.error('No access token found in firebase-tools.json');
            return;
        }

        // Fetch movements (up to 300)
        console.log('Fetching inventory_movements...');
        let movements = [];
        let nextPageToken = '';
        let loopCount = 0;
        
        do {
            const url = `https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/inventory_movements?pageSize=300${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await res.json();
            if (data.documents) {
                movements.push(...data.documents);
            }
            nextPageToken = data.nextPageToken;
            loopCount++;
        } while (nextPageToken && loopCount < 5);

        console.log(`\n--- MOVIMENTI MAGAZZINO (${movements.length} trovati) ---`);
        movements.forEach((doc, idx) => {
            const fields = doc.fields || {};
            const type = fields.type?.stringValue || '(N/A)';
            const quantity = fields.quantity?.integerValue ?? fields.quantity?.doubleValue ?? 0;
            const itemId = fields.itemId?.stringValue || '(N/A)';
            const itemName = fields.itemName?.stringValue || '(N/A)';
            const operatorName = fields.operatorName?.stringValue || '(N/A)';
            const reason = fields.reason?.stringValue || '';
            const timestamp = fields.timestamp?.integerValue ?? fields.timestamp?.doubleValue ?? 0;
            const date = timestamp ? new Date(Number(timestamp)).toLocaleString('it-IT') : 'N/A';
            
            console.log(`[${idx + 1}] Data: ${date} | Tipo: ${type.toUpperCase()} | Qta: ${quantity} | Articolo: ${itemName} (ID: ${itemId}) | Operatore: ${operatorName} | Motivo: ${reason}`);
        });

        // Fetch activity_logs (up to 1000)
        console.log('\nFetching activity_logs...');
        let logs = [];
        nextPageToken = '';
        loopCount = 0;
        
        do {
            const url = `https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/activity_logs?pageSize=300${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await res.json();
            if (data.documents) {
                logs.push(...data.documents);
            }
            nextPageToken = data.nextPageToken;
            loopCount++;
        } while (nextPageToken && loopCount < 5);

        console.log(`\n--- INVENTORY-RELATED & DELETION LOGS FROM ACTIVITY_LOGS (${logs.length} total logs fetched) ---`);
        let matchCount = 0;
        logs.forEach((doc) => {
            const fields = doc.fields || {};
            const action = fields.action?.stringValue || '';
            const category = fields.category?.stringValue || '';
            const operatorName = fields.operatorName?.stringValue || '';
            const details = fields.details?.stringValue || '';
            const timestamp = fields.timestamp?.integerValue ?? fields.timestamp?.doubleValue ?? 0;
            const date = timestamp ? new Date(Number(timestamp)).toLocaleString('it-IT') : 'N/A';
            
            const detailText = details.toLowerCase();
            const actionText = action.toLowerCase();
            const catText = category.toLowerCase();
            
            const isRelevant = 
                detailText.includes('magazzino') || detailText.includes('articolo') || detailText.includes('giacenza') ||
                detailText.includes('inventario') || detailText.includes('elimina') || detailText.includes('cancell') ||
                actionText.includes('delete') || catText.includes('inventory');

            if (isRelevant) {
                matchCount++;
                console.log(`[LOG MATCH ${matchCount}] Data: ${date} | Cat: ${category} | Act: ${action} | Op: ${operatorName} | Dettagli: ${details}`);
            }
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
