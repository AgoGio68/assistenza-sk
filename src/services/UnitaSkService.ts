import {
    collection,
    query,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    where,
    deleteField,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UnitaSk } from '../types';

const COLLECTION_NAME = 'unita_sk';

export const UnitaSkService = {
    async fetchUnits(): Promise<UnitaSk[]> {
        // Fetch all docs and filter in memory — a Firestore where('isArchived', '==', false)
        // query excludes documents that don't have the field at all (legacy records).
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }) as UnitaSk)
            .filter((u) => u.isArchived !== true); // treat missing field as false
        return data.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * Recupera TUTTE le unità SK incluse quelle archiviate (per la vista admin con toggle).
     */
    async fetchAllUnits(): Promise<UnitaSk[]> {
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UnitaSk);
        return data.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * Aggiunge una nuova unità SK verificando l'unicità del seriale
     */
    async addUnit(unit: Omit<UnitaSk, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const trimmedSerial = unit.seriale.trim();
        if (!trimmedSerial) {
            throw new Error("Il numero di serie è obbligatorio.");
        }

        // Verifica unicità seriale
        const isUnique = await this.checkSerialUniqueness(trimmedSerial);
        if (!isUnique) {
            throw new Error("Il numero di serie specificato è già presente nel sistema.");
        }

        const now = Date.now();
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            modello: unit.modello.trim(),
            seriale: trimmedSerial,
            note: unit.note ? unit.note.trim() : null,
            createdAt: now,
            updatedAt: now,
            isArchived: false,
        });

        return docRef.id;
    },

    /**
     * Aggiorna un'unità SK esistente verificando l'unicità del seriale se modificato
     */
    async updateUnit(id: string, updates: Partial<Omit<UnitaSk, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        const dataToUpdate: any = {};

        if (updates.modello !== undefined) {
            dataToUpdate.modello = updates.modello.trim();
        }

        if (updates.seriale !== undefined) {
            const trimmedSerial = updates.seriale.trim();
            if (!trimmedSerial) {
                throw new Error("Il numero di serie è obbligatorio.");
            }
            // Verifica unicità seriale escludendo l'id corrente
            const isUnique = await this.checkSerialUniqueness(trimmedSerial, id);
            if (!isUnique) {
                throw new Error("Il numero di serie specificato è già presente nel sistema.");
            }
            dataToUpdate.seriale = trimmedSerial;
        }

        if (updates.note !== undefined) {
            dataToUpdate.note = updates.note ? updates.note.trim() : null;
        }

        if (updates.assignedToInstallationId !== undefined) {
            // Stringa vuota o null → rimuove il campo (deleteField) per pulizia DB
            dataToUpdate.assignedToInstallationId =
                updates.assignedToInstallationId || deleteField();
        }

        if (updates.assignedToClientName !== undefined) {
            dataToUpdate.assignedToClientName =
                updates.assignedToClientName || deleteField();
        }

        if (updates.isArchived !== undefined) {
            // false → rimuove il campo (non serve tenerlo a false)
            dataToUpdate.isArchived = updates.isArchived === true ? true : deleteField();
        }

        dataToUpdate.updatedAt = Date.now();

        await updateDoc(doc(db, COLLECTION_NAME, id), dataToUpdate);
    },

    /**
     * Trova un'unità SK per seriale
     */
    async findUnitBySerial(serial: string): Promise<UnitaSk | null> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('seriale', '==', serial.trim())
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const firstDoc = snapshot.docs[0];
        return { id: firstDoc.id, ...firstDoc.data() } as UnitaSk;
    },

    /**
     * Elimina un'unità SK
     */
    async deleteUnit(id: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    },

    /**
     * Verifica se un seriale è univoco. Se viene fornito excludeId, esclude quell'ID dal controllo.
     */
    async checkSerialUniqueness(serial: string, excludeId?: string): Promise<boolean> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('seriale', '==', serial)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return true;
        }

        if (excludeId) {
            // Se c'è solo un documento e ha l'excludeId, allora è univoco (è se stesso)
            return snapshot.docs.every(doc => doc.id === excludeId);
        }

        return false;
    }
};
