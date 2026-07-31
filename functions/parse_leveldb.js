const fs = require('fs');
const path = require('path');

const levelDbDir = 'C:\\Users\\gagos\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\https_assistenza-sk-official.web.app_0.indexeddb.leveldb';

function run() {
    try {
        const logFile = path.join(levelDbDir, '000031.log');
        if (!fs.existsSync(logFile)) {
            console.log('Log file does not exist');
            return;
        }

        const buffer = fs.readFileSync(logFile);
        let currentString = '';
        const strings = [];

        for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            if (char >= 32 && char <= 126) {
                currentString += String.fromCharCode(char);
            } else {
                if (currentString.length >= 4) {
                    strings.push(currentString);
                }
                currentString = '';
            }
        }
        if (currentString.length >= 4) {
            strings.push(currentString);
        }

        console.log(`Total strings: ${strings.length}`);
        console.log('First 150 strings:');
        strings.slice(0, 150).forEach((s, idx) => {
            console.log(`[${idx+1}] ${s}`);
        });

    } catch (e) {
        console.error(e);
    }
}
run();
