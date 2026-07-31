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

        // 1. Fetch inventory_movements
        console.log('Fetching inventory_movements...');
        const movementsRes = await fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/inventory_movements?pageSize=100', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const movementsData = await movementsRes.json();
        
        console.log(`\n--- MOVIMENTI MAGAZZINO (${movementsData.documents?.length || 0} trovati) ---`);
        if (movementsData.documents) {
            movementsData.documents.forEach((doc, idx) => {
                const fields = doc.fields || {};
                const type = fields.type?.stringValue || '(N/A)';
                const quantity = fields.quantity?.integerValue ?? fields.quantity?.doubleValue ?? 0;
                const itemId = fields.itemId?.stringValue || '(N/A)';
                const itemName = fields.itemName?.stringValue || '(N/A)';
                const operatorName = fields.operatorName?.stringValue || '(N/A)';
                const reason = fields.reason?.stringValue || '';
                const timestamp = fields.timestamp?.integerValue ?? fields.timestamp?.doubleValue ?? 0;
                const date = timestamp ? new Date(Number(timestamp)).toISOString() : 'N/A';
                
                console.log(`[${idx + 1}] Date: ${date} | Type: ${type.toUpperCase()} | Qty: ${quantity} | Item: ${itemName} (ID: ${itemId}) | Op: ${operatorName} | Reason: ${reason}`);
            });
        }

        // 2. Fetch activity_logs
        console.log('\nFetching activity_logs...');
        const logsRes = await fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/activity_logs?pageSize=100', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const logsData = await logsRes.json();
        
        console.log(`\n--- ACTIVITY LOGS (${logsData.documents?.length || 0} trovati) ---`);
        if (logsData.documents) {
            logsData.documents.forEach((doc, idx) => {
                const fields = doc.fields || {};
                const action = fields.action?.stringValue || '';
                const category = fields.category?.stringValue || '';
                const operatorName = fields.operatorName?.stringValue || '';
                const details = fields.details?.stringValue || '';
                const timestamp = fields.timestamp?.integerValue ?? fields.timestamp?.doubleValue ?? 0;
                const date = timestamp ? new Date(Number(timestamp)).toISOString() : 'N/A';
                
                // We only care about inventory-related activity logs or delete actions
                console.log(`[${idx + 1}] Date: ${date} | Cat: ${category} | Act: ${action} | Op: ${operatorName} | Details: ${details}`);
            });
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
