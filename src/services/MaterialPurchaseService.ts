import {
    collection,
    query,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MaterialPurchase, MaterialPurchaseStatus } from '../types';

const COLLECTION_NAME = 'material_purchases';

export const MaterialPurchaseService = {
    /**
     * Recupera tutti i materiali acquistati/in arrivo
     */
    async fetchMaterials(): Promise<MaterialPurchase[]> {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as MaterialPurchase[];
    },

    /**
     * Aggiunge un nuovo materiale in arrivo
     */
    async addMaterial(
        materialData: Omit<MaterialPurchase, 'id' | 'createdAt' | 'updatedAt' | 'status'>
    ): Promise<string> {
        const now = Date.now();
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            description: materialData.description.trim(),
            quantity: materialData.quantity || 1,
            code: (materialData.code || '').trim(),
            orderDate: materialData.orderDate || new Date().toISOString().split('T')[0],
            arrivalDate: materialData.arrivalDate || '',
            client: (materialData.client || '').trim(),
            status: 'pending' as MaterialPurchaseStatus,
            createdAt: now,
            updatedAt: now,
        });

        return docRef.id;
    },

    /**
     * Aggiorna i dati di un materiale
     */
    async updateMaterial(
        id: string,
        updates: Partial<Omit<MaterialPurchase, 'id' | 'createdAt'>>
    ): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const dataToUpdate: any = {
            updatedAt: Date.now(),
        };

        if (updates.description !== undefined) dataToUpdate.description = updates.description.trim();
        if (updates.quantity !== undefined) dataToUpdate.quantity = updates.quantity;
        if (updates.code !== undefined) dataToUpdate.code = updates.code.trim();
        if (updates.orderDate !== undefined) dataToUpdate.orderDate = updates.orderDate;
        if (updates.arrivalDate !== undefined) dataToUpdate.arrivalDate = updates.arrivalDate;
        if (updates.client !== undefined) dataToUpdate.client = updates.client.trim();
        if (updates.status !== undefined) dataToUpdate.status = updates.status;

        await updateDoc(docRef, dataToUpdate);
    },

    /**
     * Conferma l'arrivo della merce
     */
    async confirmArrival(id: string, confirmedBy: string = ''): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const now = Date.now();
        await updateDoc(docRef, {
            status: 'arrived',
            confirmedAt: now,
            confirmedBy: confirmedBy,
            updatedAt: now,
        });
    },

    /**
     * Inverte lo stato di un materiale tra 'pending' e 'arrived'
     */
    async toggleArrivalStatus(
        id: string,
        currentStatus: MaterialPurchaseStatus,
        confirmedBy: string = ''
    ): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const now = Date.now();
        if (currentStatus === 'pending') {
            await updateDoc(docRef, {
                status: 'arrived',
                confirmedAt: now,
                confirmedBy: confirmedBy,
                updatedAt: now,
            });
        } else {
            await updateDoc(docRef, {
                status: 'pending',
                updatedAt: now,
            });
        }
    },

    /**
     * Elimina un singolo materiale
     */
    async deleteMaterial(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    },

    /**
     * Eliminazione massiva dei materiali
     */
    async deleteMultipleMaterials(ids: string[]): Promise<void> {
        if (!ids || ids.length === 0) return;
        const batch = writeBatch(db);
        ids.forEach((id) => {
            const docRef = doc(db, COLLECTION_NAME, id);
            batch.delete(docRef);
        });
        await batch.commit();
    },
};
