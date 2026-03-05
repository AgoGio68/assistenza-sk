const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getBytes, uploadBytes, getMetadata } = require('firebase/storage');

const oldConfig = {
    apiKey: "AIzaSyD63d5jAcqa8bNkBUxM7FRK7oxeJbIjoXQ",
    authDomain: "assistenza-sk.firebaseapp.com",
    projectId: "assistenza-sk",
    storageBucket: "assistenza-sk.firebasestorage.app"
};

const newConfig = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official",
    storageBucket: "assistenza-sk-official.firebasestorage.app"
};

const syncStorage = async () => {
    console.log("📂 Avvio sincronizzazione Storage (cartella tickets)...");
    const oldApp = initializeApp(oldConfig, 'old_storage');
    const newApp = initializeApp(newConfig, 'new_storage');

    const oldStorage = getStorage(oldApp);
    const newStorage = getStorage(newApp);

    const folderRef = ref(oldStorage, 'tickets');

    try {
        const res = await listAll(folderRef);
        console.log(`🔍 Trovati ${res.items.length} file principali in 'tickets'.`);

        // Funzione ricorsiva per gestire eventuali sottocartelle
        const syncFolder = async (folderRes, path) => {
            // Sincronizza i file nella cartella corrente
            for (const itemRef of folderRes.items) {
                console.log(`  -> Sincronizzazione file: ${itemRef.fullPath}`);
                const data = await getBytes(itemRef);
                const metadata = await getMetadata(itemRef);
                const targetRef = ref(newStorage, itemRef.fullPath);
                await uploadBytes(targetRef, data, { contentType: metadata.contentType });
            }

            // Entra nelle sottocartelle
            for (const subFolderRef of folderRes.prefixes) {
                console.log(`📂 Entro nella sottocartella: ${subFolderRef.fullPath}`);
                const subRes = await listAll(subFolderRef);
                await syncFolder(subRes, subFolderRef.fullPath);
            }
        };

        await syncFolder(res, 'tickets');
        console.log("\n✨ Sincronizzazione Storage completata con successo!");

    } catch (error) {
        console.error("❌ Errore durante la sincronizzazione:", error);
    } finally {
        process.exit();
    }
};

syncStorage();
