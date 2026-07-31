/**
 * Seconda istanza Firebase — progetto rapportini-dfv
 *
 * Questo file inizializza una connessione separata al Firebase project
 * "rapportini-dfv" che usa il Realtime Database e Firebase Storage.
 * Serve per far condividere i dati tra assistenza-sk e rapportini-dfv
 * in modo completamente trasparente: tutti gli utenti vedono le stesse foto.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const RAPPORTINI_APP_NAME = 'rapportini-dfv';

const rapportiniConfig = {
    apiKey: 'AIzaSyD5UHY1lH6cA_Ix2ego9c2DLhq8ScK1zYM',
    authDomain: 'rapportini-dfv.firebaseapp.com',
    databaseURL: 'https://rapportini-dfv-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'rapportini-dfv',
    storageBucket: 'rapportini-dfv.firebasestorage.app',
    messagingSenderId: '839574377906',
    appId: '1:839574377906:web:9c993e00e15652836380ab',
};

// Inizializza solo se non è già stata inizializzata (hot-reload safe)
const existingApp = getApps().find((a) => a.name === RAPPORTINI_APP_NAME);
export const rapportiniApp = existingApp ?? initializeApp(rapportiniConfig, RAPPORTINI_APP_NAME);

export const rapportiniDb = getDatabase(rapportiniApp);
export const rapportiniStorage = getStorage(rapportiniApp);
export const rapportiniAuth = getAuth(rapportiniApp);

// Autenticazione anonima silenziosa sul progetto rapportini-dfv.
// Le regole del Realtime DB richiedono auth != null, quindi è necessaria.
let _authReady = false;
onAuthStateChanged(rapportiniAuth, (user) => {
    if (user) {
        _authReady = true;
    } else {
        signInAnonymously(rapportiniAuth).catch((err) => {
            console.error('[rapportini-dfv] Errore autenticazione anonima:', err.message);
        });
    }
});

export const isRapportiniAuthReady = () => _authReady;
