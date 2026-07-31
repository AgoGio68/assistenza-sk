/**
 * Script per impostare Luciano Manzocchi come superadmin.
 * Usa l'access token della Firebase CLI per chiamare la Firestore REST API.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

async function run() {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const accessToken = configData.tokens?.access_token;
        const expiresAt = configData.tokens?.expires_at;

        if (!accessToken) {
            console.error('No access token found. Run: firebase login');
            process.exit(1);
        }

        if (expiresAt && Date.now() > expiresAt) {
            console.error('Access token scaduto. Esegui: firebase login');
            process.exit(1);
        }

        console.log('✅ Access token trovato e valido.');

        const PROJECT_ID = 'assistenza-sk-official';
        const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

        // Fetch all users
        console.log('\n📋 Recupero utenti da Firestore...');
        const response = await fetch(`${BASE_URL}/users?pageSize=100`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errText);
            process.exit(1);
        }

        const data = await response.json();
        const docs = data.documents || [];
        console.log(`Trovati ${docs.length} utenti:\n`);

        // Print all users for reference
        docs.forEach((doc, idx) => {
            const f = doc.fields || {};
            const nome = f.nome?.stringValue || '';
            const cognome = f.cognome?.stringValue || '';
            const email = f.email?.stringValue || '';
            const role = f.role?.stringValue || '(N/A)';
            console.log(` [${idx + 1}] ${nome} ${cognome} | ${email} | ruolo: ${role}`);
        });

        // Find Manzocchi
        let target = null;
        for (const doc of docs) {
            const fields = doc.fields || {};
            const cognome = (fields.cognome?.stringValue || '').toLowerCase();
            const displayName = (fields.displayName?.stringValue || '').toLowerCase();
            const email = (fields.email?.stringValue || '').toLowerCase();

            if (
                cognome.includes('manzocchi') ||
                displayName.includes('manzocchi') ||
                email.includes('manzocchi')
            ) {
                target = doc;
                const n = fields.nome?.stringValue || '';
                const c = fields.cognome?.stringValue || '';
                const rol = fields.role?.stringValue || '(N/A)';
                console.log(`\n✅ Trovato: ${n} ${c} | ${email} | Ruolo attuale: ${rol}`);
                break;
            }
        }

        if (!target) {
            console.log('\n❌ Nessun utente con cognome "Manzocchi" trovato.');
            process.exit(1);
        }

        const currentRole = target.fields?.role?.stringValue;
        if (currentRole === 'superadmin') {
            console.log('\n⚠️  L\'utente è già superadmin. Nessuna modifica necessaria.');
            process.exit(0);
        }

        // PATCH to update role
        const docName = target.name;
        const patchUrl = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=role&updateMask.fieldPaths=status`;

        console.log('\n📝 Aggiornamento ruolo in corso...');
        const patchResponse = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    role: { stringValue: 'superadmin' },
                    status: { stringValue: 'approved' }
                }
            })
        });

        if (!patchResponse.ok) {
            const errText = await patchResponse.text();
            console.error(`❌ Errore aggiornamento: ${patchResponse.status}`, errText);
            process.exit(1);
        }

        const updated = await patchResponse.json();
        const newRole = updated.fields?.role?.stringValue;
        console.log(`\n🎉 Fatto! Luciano Manzocchi ha ora il ruolo: ${newRole}`);
        process.exit(0);

    } catch (e) {
        console.error('Errore:', e);
        process.exit(1);
    }
}

run();
