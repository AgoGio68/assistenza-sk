const admin = require('firebase-admin');

// Per eseguire questo script, devi aver scaricato il fil "serviceAccountKey.json" 
// dalle impostazioni del nuovo progetto Firebase del cliente e averlo messo nella stessa cartella.

try {
    const serviceAccount = require('./serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    const auth = admin.auth();

    async function installClient() {
        console.log('==============================================');
        console.log('    INSTALLAZIONE NUOVO CLIENTE (Versione 1.6) ');
        console.log('==============================================\n');

        try {
            console.log('1. Creazione dell\'Utente SuperAdmin...');

            let userRecord;
            try {
                userRecord = await auth.getUserByEmail('admin@admin.it');
                console.log('   - Utente admin@admin.it esiste già.');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await auth.createUser({
                        email: 'admin@admin.it',
                        password: 'admin',
                        displayName: 'Super Admin',
                    });
                    console.log('   - Utente admin@admin.it creato con password "admin".');
                } else {
                    throw error;
                }
            }

            console.log('\n2. Preparazione Database (Impostazione Permessi)...');
            await db.collection('users').doc(userRecord.uid).set({
                email: 'admin@admin.it',
                displayName: 'Super Admin',
                role: 'superadmin',
                status: 'approved',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('   - Permessi SuperAdmin salvati nel Database locale.');

            console.log('\n3. Inizializzazione Impostazioni Generiche...');
            await db.collection('settings').doc('global').set({
                appName: 'Nuovo Sistema Sk',
                primaryColor: '#2563eb',
                secondaryColor: '#1e40af',
                logoUrl: '',
                ticketVisibilityMode: 'company_only',
                ticketLayoutMode: 'compact'
            }, { merge: true });
            console.log('   - Impostazioni base applicate.');

            console.log('\n[INSTALLAZIONE COMPLETATA CON SUCCESSO!');
            console.log('Puoi ora lanciare "npm run build" e "firebase deploy" sul nuovo progetto.');
            process.exit(0);

        } catch (err) {
            console.error('\n[ERRORE DURANTE L\'INSTALLAZIONE]:', err);
            process.exit(1);
        }
    }

    installClient();

} catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        console.error('\n[ERRORE CRITICO] File "serviceAccountKey.json" non trovato!');
        console.error('Devi andare nella Console Firebase -> Impostazioni Progetto -> Account di Servizio');
        console.error('Generare una nuova chiave privata e rinominare il file scaricato in "serviceAccountKey.json" dentro questa cartella.\n');
        process.exit(1);
    } else {
        console.error(e);
        process.exit(1);
    }
}
