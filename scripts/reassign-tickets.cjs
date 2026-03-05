const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const newConfig = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official"
};

// Mappa Email -> Nuovo UID
const userMapping = {
    "acquistidfv@gmail.com": "JYClzf833NTdhfkwMuyGUGWRNbp1",
    "skitalia@gmail.com": "ZjmbU5kADleAwIW48dua5Q0OAq52",
    "g.agostini@dfvautomazioni.it": "bpaVu2zig5N5aZRsXT0eXDk5epx1"
};

const runReassignment = async () => {
    console.log("🔄 Avvio riassegnazione ticket...");
    const app = initializeApp(newConfig);
    const db = getFirestore(app);

    try {
        const querySnapshot = await getDocs(collection(db, 'tickets'));
        console.log(`Processing ${querySnapshot.size} tickets...`);

        for (const ticketDoc of querySnapshot.docs) {
            const data = ticketDoc.data();
            const updates = {};

            // 1. Riassegna Autore (authorEmail)
            if (data.authorEmail && userMapping[data.authorEmail]) {
                updates.authorId = userMapping[data.authorEmail];
                console.log(`Ticket ${ticketDoc.id}: Mapped authorId to ${updates.authorId}`);
            }

            // 2. Riassegna Assegnatario (assignedTo)
            // Nota: Se assignedTo era un'email nel vecchio sistema, lo mappiamo al nuovo UID
            if (data.assignedTo && userMapping[data.assignedTo]) {
                updates.assignedTo = userMapping[data.assignedTo];
                console.log(`Ticket ${ticketDoc.id}: Mapped assignedTo to ${updates.assignedTo}`);
            }

            // 3. Se il ticket è chiuso, mappiamo anche closedBy se presente
            if (data.status === 'closed' && data.closedBy && userMapping[data.closedBy]) {
                updates.closedBy = userMapping[data.closedBy];
                console.log(`Ticket ${ticketDoc.id}: Mapped closedBy to ${updates.closedBy}`);
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'tickets', ticketDoc.id), updates);
            }
        }

        console.log("✅ Riassegnazione completata!");
    } catch (error) {
        console.error("❌ Errore:", error);
    } finally {
        process.exit();
    }
};

runReassignment();
