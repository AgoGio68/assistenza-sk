const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Keys in firebase-tools.json:', Object.keys(data));
    if (data.tokens) {
        console.log('Keys in data.tokens:', Object.keys(data.tokens));
    }
    if (data.user) {
        console.log('Keys in data.user:', Object.keys(data.user));
    }
} catch (e) {
    console.error('Error reading config file:', e.message);
}
