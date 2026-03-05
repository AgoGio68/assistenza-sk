const https = require('https');

const oldBucket = "assistenza-sk.firebasestorage.app";
const newBucket = "assistenza-sk-official.firebasestorage.app";

const listFiles = (bucket, prefix) => {
    return new Promise((resolve, reject) => {
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data).items || []);
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
};

const runListTest = async () => {
    console.log(`📡 Interrogazione REST API per bucket: ${oldBucket}`);
    try {
        const items = await listFiles(oldBucket, 'tickets/');
        console.log(`✅ Trovati ${items.length} file:`);
        items.forEach(i => console.log(`  - ${i.name}`));
    } catch (e) {
        console.error("❌ Errore REST:", e.message);

        console.log(`\n📡 Riprovo con bucket alternativo: assistenza-sk.appspot.com`);
        try {
            const items = await listFiles("assistenza-sk.appspot.com", 'tickets/');
            console.log(`✅ Trovati ${items.length} file:`);
            items.forEach(i => console.log(`  - ${i.name}`));
        } catch (e2) {
            console.error("❌ Errore REST (appspot):", e2.message);
        }
    }
    process.exit();
};

runListTest();
