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

        console.log('Listing all collection IDs in Firestore...');
        const response = await fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents:listCollectionIds', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errText);
            return;
        }

        const data = await response.json();
        console.log('Collections:', data.collectionIds);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
