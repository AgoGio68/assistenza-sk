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
        const strings = new Set();

        for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            if (char >= 32 && char <= 126) {
                currentString += String.fromCharCode(char);
            } else {
                if (currentString.length >= 4 && currentString.length <= 50) {
                    strings.add(currentString.trim());
                }
                currentString = '';
            }
        }
        if (currentString.length >= 4 && currentString.length <= 50) {
            strings.add(currentString.trim());
        }

        const stringList = Array.from(strings);
        console.log(`Unique strings extracted: ${stringList.length}`);

        // We want to find potential inventory item names.
        // Let's filter out strings that are obviously:
        // - JWT/Token segments (base64)
        // - URL parts
        // - email addresses
        // - Firebase internals
        // - standard UI labels
        const filtered = stringList.filter(s => {
            if (s.includes('http') || s.includes('/') || s.includes(':') || s.includes('@') || s.includes('.') || s.includes('_')) {
                return false;
            }
            if (/^[a-zA-Z0-9+/=]{20,}$/.test(s)) {
                // looks like base64 / token
                return false;
            }
            if (/^(firebase|fbase|stsToken|refreshToken|accessToken|expirationTime|redirectEvent|createdAt|lastLogin|apiKey|appName|providerId|emailVerified|displayName|isAnonymous|photoURL|phoneNumber|tenantId|providerData|userRole|resourceType|resourceId|action|details|metadata|timestamp)$/i.test(s)) {
                return false;
            }
            // Ignore pure numbers unless they look like codes
            if (/^\d+$/.test(s) && s.length < 5) {
                return false;
            }
            return true;
        });

        console.log(`\nFiltered candidates: ${filtered.length}`);
        
        // Let's look for specific terms or uppercase strings
        console.log('\n--- UPPERCASE / ALPHANUMERIC CANDIDATES (POTENTIAL ITEMS OR CODES) ---');
        filtered.forEach(s => {
            // If it's mostly uppercase or has numbers and letters, or contains typical Italian words
            const isUpper = s === s.toUpperCase() && /[A-Z]/.test(s);
            const isItemKeyword = /lemo|sensore|cavo|modulo|sk|dmi|piezo|scheda|alimentatore|spina|presa|connettore|staffa/i.test(s);
            if (isUpper || isItemKeyword) {
                console.log(`- ${s}`);
            }
        });

        console.log('\n--- OTHER INTERESTING STRINGS ---');
        filtered.forEach(s => {
            const isUpper = s === s.toUpperCase() && /[A-Z]/.test(s);
            const isItemKeyword = /lemo|sensore|cavo|modulo|sk|dmi|piezo|scheda|alimentatore|spina|presa|connettore|staffa/i.test(s);
            if (!isUpper && !isItemKeyword && s.length > 5) {
                console.log(`- ${s}`);
            }
        });

    } catch (e) {
        console.error(e);
    }
}
run();
