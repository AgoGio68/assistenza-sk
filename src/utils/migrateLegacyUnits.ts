import { getDocs, collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export const migrateLegacyUnits = async () => {
    try {
        console.log("🚀 Inizio migrazione unità SK (isArchived: false)...");
        toast.loading("Avvio migrazione unità SK...", { id: "migration" });

        const querySnapshot = await getDocs(collection(db, 'unita_sk'));
        const total = querySnapshot.size;
        console.log(`✅ Trovate ${total} unità in totale.`);

        let count = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const unitDoc of querySnapshot.docs) {
            const data = unitDoc.data();
            const id = unitDoc.id;

            // Se isArchived non è definito (undefined), lo aggiorniamo a false
            if (data.isArchived === undefined) {
                batch.update(doc(db, 'unita_sk', id), { isArchived: false });
                count++;
                batchCount++;

                // Eseguiamo il commit ogni 400 scritture (il limite di Firestore è 500)
                if (batchCount >= 400) {
                    await batch.commit();
                    console.log(`⏳ Commit di ${batchCount} documenti eseguito...`);
                    batch = writeBatch(db);
                    batchCount = 0;
                }
            }
        }

        // Commit finale per i documenti rimanenti
        if (batchCount > 0) {
            await batch.commit();
            console.log(`⏳ Commit finale di ${batchCount} documenti eseguito...`);
        }

        console.log(`\n✨ Migrazione completata con successo! ${count} unità aggiornate con isArchived: false.`);
        toast.success(`Migrazione completata! ${count} unità aggiornate.`, { id: "migration" });
    } catch (error) {
        console.error("❌ Errore durante la migrazione:", error);
        toast.error("Errore durante la migrazione. Controlla la console.", { id: "migration" });
    }
};
