const fs = require('fs');
const path = require('path');

const levelDbDir = 'C:\\Users\\gagos\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\https_assistenza-sk-official.web.app_0.indexeddb.leveldb';

function run() {
    try {
        if (!fs.existsSync(levelDbDir)) {
            console.log('LevelDB directory does not exist');
            return;
        }

        const files = fs.readdirSync(levelDbDir);
        console.log(`Files in LevelDB dir: ${files.join(', ')}`);

        const searchTerms = ['LEMO', 'pippo', 'pippa', 'MASCHIO', 'FEMMINA', '222222', '654321', '0909090909099', '45678789', 'stock', 'minThreshold', 'inventory'];

        files.forEach(file => {
            const filePath = path.join(levelDbDir, file);
            try {
                const stat = fs.statSync(filePath);
                if (stat.isFile()) {
                    const buffer = fs.readFileSync(filePath);
                    searchTerms.forEach(term => {
                        const idx = buffer.indexOf(term);
                        if (idx !== -1) {
                            console.log(`FOUND "${term}" in ${file} at index ${idx}!`);
                        }
                    });
                }
            } catch (err) {
                console.log(`Error reading ${file}: ${err.message}`);
            }
        });

    } catch (e) {
        console.error(e);
    }
}
run();
