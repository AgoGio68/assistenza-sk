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

        console.log('Fetching users from Firestore...');
        const response = await fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/users?pageSize=100', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errText);
            return;
        }

        const data = await response.json();
        console.log(`\n--- UTENTI (${data.documents?.length || 0} trovati) ---`);
        if (data.documents) {
            data.documents.forEach((doc, idx) => {
                const fields = doc.fields || {};
                const email = fields.email?.stringValue || '(N/A)';
                const displayName = fields.displayName?.stringValue || '(N/A)';
                const role = fields.role?.stringValue || '(N/A)';
                const status = fields.status?.stringValue || '(N/A)';
                console.log(`[${idx + 1}] Email: ${email} | Name: ${displayName} | Role: ${role} | Status: ${status} | ID: ${doc.name.split('/').pop()}`);
            });
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
