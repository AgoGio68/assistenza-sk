const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, deleteDoc } = require('firebase/firestore');

const config = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official"
};

const clean = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '_');

const getInstId = (orderNumber, client, machine, pos) =>
    `inst-${clean(orderNumber)}-${clean(client)}-${clean(machine)}-${pos}`;

const run = async () => {
    const app = initializeApp(config, 'find-milani');
    const db = getFirestore(app);

    // 1. Recupera URL foglio
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    const sheetUrl = settingsDoc.data()?.installationsSheetUrl;
    if (!sheetUrl) { console.log('URL foglio non trovato'); process.exit(1); }

    const sheetIdMatch = sheetUrl.match(/\/d\/([^/]+)/);
    const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
    const sheetId = sheetIdMatch[1];
    const gid = gidMatch ? gidMatch[1] : '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    console.log('Scarico CSV...');
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
    const res = await (globalThis.fetch || fetch)(csvUrl);
    const csv = await res.text();

    // Parser CSV semplice
    const rows = csv.split('\n').slice(1).map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim()));

    console.log(`\nRighe dati: ${rows.length}`);
    console.log('\nCerco Milani...\n');

    const toDelete = [];

    rows.forEach((parts, index) => {
        const client = parts[1] || '';
        const machine = parts[2] || '';
        const orderNum = parts[0] || '';
        
        if (client.toLowerCase().includes('milani') || machine.includes('653')) {
            const rowId = `row-${index}`;
            console.log(`TROVATO: index=${index}, rowId=${rowId}`);
            console.log(`  Ordine: ${orderNum}, Cliente: ${client}, Macchina: ${machine}`);
            console.log(`  Colonna5: ${parts[4]}, Part6: ${parts[5]}`);
            toDelete.push(rowId);
        }
    });

    if (toDelete.length === 0) {
        console.log('Nessuna riga Milani trovata nel foglio.');
    } else {
        console.log(`\nElimino documenti Firestore: ${toDelete.join(', ')}`);
        const snap = await getDocs(collection(db, 'installation_data'));
        for (const d of snap.docs) {
            if (toDelete.includes(d.id) || d.id.toLowerCase().includes('milani')) {
                await deleteDoc(doc(db, 'installation_data', d.id));
                console.log(`✅ Eliminato: ${d.id}`);
            }
        }
    }

    process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
