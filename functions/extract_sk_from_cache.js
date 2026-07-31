const fs = require('fs');

const levelDbDir = 'C:\\Users\\gagos\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\https_assistenza-sk-official.web.app_0.indexeddb.leveldb';

function extractStrings(filePath, minLen = 4, maxLen = 300) {
    const buffer = fs.readFileSync(filePath);
    const strings = [];
    let current = '';
    for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c >= 32 && c <= 126) {
            current += String.fromCharCode(c);
        } else {
            if (current.length >= minLen && current.length <= maxLen) {
                strings.push(current.trim());
            }
            current = '';
        }
    }
    if (current.length >= minLen) strings.push(current.trim());
    return strings;
}

function run() {
    const files = ['000031.log', '000033.ldb'];
    const allStrings = new Set();
    
    files.forEach(fname => {
        const fp = levelDbDir + '\\' + fname;
        if (fs.existsSync(fp)) {
            try {
                const strs = extractStrings(fp);
                strs.forEach(s => allStrings.add(s));
                console.log(`Extracted ${strs.length} strings from ${fname}`);
            } catch(e) {
                console.log(`Cannot read ${fname}: ${e.message}`);
            }
        }
    });

    const all = Array.from(allStrings);
    
    // Cerca tutto quello che contiene SK (modelli, componenti, articoli magazzino)
    console.log('\n=== STRINGHE CHE CONTENGONO "SK" ===');
    const skStrings = all.filter(s => /\bSK\d/i.test(s) || /SK[45678]\./i.test(s) || /SK\d{3}/i.test(s));
    skStrings.forEach(s => console.log('  >> ' + s));
    
    // Cerca nomi di componenti tipici magazzino
    console.log('\n=== COMPONENTI TIPICI MAGAZZINO (sensore, lemo, cavo, modulo, ecc.) ===');
    const compStrings = all.filter(s => 
        /sensore|lemo|cavo|modulo|piezo|scheda|alimentatore|spina|presa|connettore|staffa|piedino|guarnizione|vite|bullone|dado|molla|condensatore|resistenza|transistor|diodo|relè|rele|fusibile|trasformatore|encoder|attuatore/i.test(s)
    );
    compStrings.forEach(s => console.log('  >> ' + s));
    
    // Cerca pattern "name":"..." nei JSON serializzati
    console.log('\n=== PATTERN JSON name/code/stock ===');
    const jsonStrings = all.filter(s => 
        s.includes('"name"') || s.includes('"code"') || s.includes('"stock"') || 
        s.includes('minThreshold') || s.includes('inventory')
    );
    jsonStrings.forEach(s => console.log('  >> ' + s.substring(0, 400)));
    
    // Cerca stringhe con codici numerici tipici di ricambi
    console.log('\n=== STRINGHE CON CODICI ARTICOLO (uppercase + numeri) ===');
    const codeStrings = all.filter(s => {
        return /^[A-Z]{2,}[\s\-_][A-Z0-9\-_\s]{3,}$/.test(s) && s.length < 60 && !s.includes('http') && !s.includes('@');
    });
    codeStrings.forEach(s => console.log('  >> ' + s));
    
    console.log('\nTotale stringhe uniche trovate:', all.length);
}

run();
