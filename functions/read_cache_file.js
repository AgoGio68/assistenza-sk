const fs = require('fs');

const logPath = 'C:\\Users\\gagos\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\https_assistenza-sk-official.web.app_0.indexeddb.leveldb\\000031.log';

try {
    const fd = fs.openSync(logPath, fs.constants.O_RDONLY);
    const stat = fs.fstatSync(fd);
    const buf = Buffer.alloc(stat.size);
    const bytesRead = fs.readSync(fd, buf, 0, stat.size, 0);
    fs.closeSync(fd);
    console.log('Letto OK:', bytesRead, 'bytes dal file cache Chrome');

    // Estrai tutte le stringhe ASCII stampabili
    let current = '';
    const found = new Set();
    for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        if (c >= 32 && c <= 126) {
            current += String.fromCharCode(c);
        } else {
            if (current.length >= 5) found.add(current.trim());
            current = '';
        }
    }
    if (current.length >= 5) found.add(current.trim());

    const all = Array.from(found);
    console.log('Stringhe uniche estratte:', all.length);

    // 1. Cerca inventory / magazzino / SK articoli
    console.log('\n=== INVENTORY / SK ===');
    const inv = all.filter(s => /inventory|magazzino/i.test(s) || /\bSK\s*[0-9]/.test(s));
    if (inv.length === 0) console.log('  (nessuna)');
    inv.forEach(s => console.log('  >> ' + s.substring(0, 300)));

    // 2. Cerca componenti tipici del magazzino SK
    console.log('\n=== COMPONENTI (sensore, lemo, cavo, modulo, piezo, kit, ricambio) ===');
    const comp = all.filter(s => /sensore|lemo|cavo\b|modulo|piezo|scheda|alimentat|connett|staffa|guarniz|piedino|kit\b|ricambio|spina\b|presa\b/i.test(s));
    if (comp.length === 0) console.log('  (nessuna)');
    comp.forEach(s => console.log('  >> ' + s.substring(0, 300)));

    // 3. Cerca pattern Firestore serializzati (name, code, stock, minThreshold)
    console.log('\n=== CAMPI FIRESTORE (name/code/stock/threshold) ===');
    const fire = all.filter(s => s.includes('"name"') || s.includes('"code"') || s.includes('"stock"') || s.includes('threshold') || s.includes('minThreshold') || s.includes('itemName') || s.includes('itemId'));
    if (fire.length === 0) console.log('  (nessuna)');
    fire.forEach(s => console.log('  >> ' + s.substring(0, 400)));

    // 4. Stringhe uppercase lunghe (possibili nomi articoli inseriti a mano)
    console.log('\n=== STRINGHE UPPERCASE (possibili nomi articoli) ===');
    const upper = all.filter(s => {
        if (s.length < 4 || s.length > 80) return false;
        if (s.includes('http') || s.includes('google') || s.includes('firebase') || s.includes('//')) return false;
        return /^[A-Z][A-Z0-9\s\-\/\.]{3,}$/.test(s);
    });
    if (upper.length === 0) console.log('  (nessuna)');
    upper.forEach(s => console.log('  >> ' + s));

    // 5. Dump tutti i JSON validi (potrebbero contenere dati Firestore)
    console.log('\n=== JSON VALIDI TROVATI ===');
    let jsonCount = 0;
    all.forEach(s => {
        if (s.startsWith('{') || s.startsWith('[')) {
            try {
                const obj = JSON.parse(s);
                console.log('  JSON[' + (++jsonCount) + ']: ' + JSON.stringify(obj).substring(0, 300));
            } catch(e) {}
        }
    });
    if (jsonCount === 0) console.log('  (nessun JSON valido)');

} catch(e) {
    console.error('ERRORE lettura file cache:', e.message);
}
