const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

async function checkProject(projectId, accessToken) {
    try {
        console.log(`Checking inventory for project: ${projectId}...`);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/inventory`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        console.log(`Status for ${projectId}:`, res.status);
        if (res.status === 200) {
            const data = await res.json();
            console.log(`Documents in ${projectId} inventory:`, data.documents?.length || 0);
            if (data.documents) {
                data.documents.slice(0, 5).forEach((doc, idx) => {
                    console.log(`  [${idx+1}]`, doc.name.split('/').pop(), JSON.stringify(doc.fields));
                });
            }
        } else {
            const text = await res.text();
            console.log(`Response for ${projectId}:`, text);
        }
    } catch (e) {
        console.error(`Error checking ${projectId}:`, e.message);
    }
}

async function run() {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const accessToken = configData.tokens?.access_token;
        if (!accessToken) {
            console.error('No access token found in firebase-tools.json');
            return;
        }

        await checkProject('rapportini-dfv', accessToken);
        await checkProject('turni-sda', accessToken);
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
