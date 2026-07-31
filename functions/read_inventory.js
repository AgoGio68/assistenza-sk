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

        console.log('Sending request to Firestore REST API...');
        const response = await fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/inventory?pageSize=100', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errText);
            return;
        }

        const data = await response.json();
        console.log(`Successfully fetched ${data.documents?.length || 0} items from 'inventory' collection.`);
        
        // Print all items
        if (data.documents) {
            data.documents.forEach((doc, idx) => {
                const fields = doc.fields || {};
                const name = fields.name?.stringValue || '(N/A)';
                const code = fields.code?.stringValue || '(N/A)';
                const stock = fields.stock?.integerValue ?? fields.stock?.doubleValue ?? '(N/A)';
                const minThreshold = fields.minThreshold?.integerValue ?? fields.minThreshold?.doubleValue ?? '(N/A)';
                console.log(`[${idx + 1}] Name: ${name} | Code: ${code} | Stock: ${stock} | Min: ${minThreshold} | ID: ${doc.name.split('/').pop()}`);
            });
        } else {
            console.log('No documents found in inventory.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
