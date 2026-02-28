const crypto = require('crypto');
const readline = require('readline');

// Questi devono matchare ESATTAMENTE con l'app
const MASTER_SECRET = 'Sup3rS3cr3t_M4st3r_K3y_99!';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('==============================================');
console.log('    GENERATORE CODICE SBLOCCO (Versione 1.6)  ');
console.log('==============================================\n');

rl.question('Inserisci il "CODICE RICHIESTA" mostrato sull\'app del cliente:\n> ', (inputCode) => {

    // Pulisci l'input da spazi e trattini
    const cleanRequestCode = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanRequestCode || cleanRequestCode.length !== 16) {
        console.error('\n[ERRORE] Il codice richiesta deve essere di 16 caratteri alfanumerici.');
        rl.close();
        return;
    }

    // Calcola il codice di sblocco (Unlock Code)
    const verifyRaw = `${cleanRequestCode}|${MASTER_SECRET}`;
    const expectedVerifyCode = crypto.createHash('sha256').update(verifyRaw).digest('hex').substring(0, 20).toUpperCase();

    // Formatta l'output
    const formattedCode = expectedVerifyCode.match(/.{1,5}/g).join('-');

    console.log('\n----------------------------------------------');
    console.log('   CODICE DI SBLOCCO DA CONSEGNARE:');
    console.log(`   ${formattedCode}`);
    console.log('----------------------------------------------\n');

    rl.close();
});
