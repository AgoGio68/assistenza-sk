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

        const bucket = "assistenza-sk-official.firebasestorage.app";
        console.log(`Listing files in Firebase Storage bucket: ${bucket}...`);
        
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        
        if (!res.ok) {
            const text = await res.text();
            console.error(`HTTP error ${res.status}:`, text);
            return;
        }
        
        const data = await res.json();
        const items = data.items || [];
        console.log(`\nFound ${items.length} files in Storage:`);
        items.forEach((item, idx) => {
            console.log(`[${idx + 1}] Name: ${item.name} | Size: ${item.size} bytes | Created: ${item.timeCreated}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
