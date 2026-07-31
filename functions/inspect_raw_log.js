const fs = require('fs');
const path = require('path');

const logFile = 'C:\\Users\\gagos\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\https_assistenza-sk-official.web.app_0.indexeddb.leveldb\\000031.log';

function run() {
    try {
        if (!fs.existsSync(logFile)) {
            console.log('Log file does not exist');
            return;
        }

        const buffer = fs.readFileSync(logFile);
        console.log(`Log file size: ${buffer.length} bytes`);

        // Check if current inventory items exist in the log file
        const searchTerms = ['LEMO', 'pippo', 'pippa', 'MASCHIO', 'FEMMINA', '222222', '654321', '0909090909099', '45678789'];
        
        searchTerms.forEach(term => {
            const index = buffer.indexOf(term);
            if (index !== -1) {
                console.log(`Found term "${term}" at index ${index}. Context:`);
                const start = Math.max(0, index - 50);
                const end = Math.min(buffer.length, index + term.length + 50);
                const slice = buffer.slice(start, end);
                
                // Hex and ASCII dump
                let hex = '';
                let ascii = '';
                for (let i = 0; i < slice.length; i++) {
                    const b = slice[i];
                    hex += b.toString(16).padStart(2, '0') + ' ';
                    ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
                }
                console.log(`Hex:   ${hex}`);
                console.log(`ASCII: ${ascii}`);
            } else {
                console.log(`Term "${term}" NOT found in log file.`);
            }
        });

    } catch (e) {
        console.error(e);
    }
}
run();
