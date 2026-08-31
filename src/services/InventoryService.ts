import {
    collection,
    query,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    orderBy,
    increment,
    getDoc,
    where,
    limit,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem, InventoryMovement } from '../types';

const INVENTORY_COLLECTION = 'inventory';
const MOVEMENTS_COLLECTION = 'inventory_movements';
const MAIL_COLLECTION = 'mail';
// ROB-02: Cooldown minimo tra due alert email per lo stesso articolo (24 ore)
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;


export const InventoryService = {
    /**
     * Recupera tutti gli articoli in magazzino
     */
    async fetchItems(): Promise<InventoryItem[]> {
        // GAGOS: Rimuoviamo l'orderBy server-side perché escluderebbe gli articoli che non hanno ancora il campo sortOrder
        const q = query(collection(db, INVENTORY_COLLECTION));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InventoryItem);
        
        // Ordiniamo in memoria: diamo priorità al sortOrder, altrimenti usiamo il nome
        return data.sort((a, b) => {
            const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    },

    /**
     * Aggiunge un nuovo articolo
     * PERF-03: query ottimizzata — recupera solo il documento con sortOrder più alto invece
     * di scaricare l'intera collezione
     */
    async addItem(item: Omit<InventoryItem, 'id'>): Promise<string> {
        const q = query(
            collection(db, INVENTORY_COLLECTION),
            orderBy('sortOrder', 'desc'),
            limit(1),
        );
        const snap = await getDocs(q);
        const maxOrder = snap.empty ? 0 : (snap.docs[0].data().sortOrder || 0);
        
        const docRef = await addDoc(collection(db, INVENTORY_COLLECTION), {
            ...item,
            sortOrder: maxOrder + 100,
            lastUpdated: Date.now(),
        });
        return docRef.id;
    },

    /**
     * Aggiorna massivamente l'ordine degli articoli (Batch update)
     */
    async updateItemsOrder(items: InventoryItem[]): Promise<void> {
        const batch = writeBatch(db);
        
        items.forEach((item, index) => {
            if (item.id) {
                const docRef = doc(db, INVENTORY_COLLECTION, item.id);
                batch.update(docRef, { 
                    sortOrder: index * 100,
                    lastUpdated: Date.now()
                });
            }
        });
        
        await batch.commit();
    },

    /**
     * Aggiorna un articolo esistente
     */
    async updateItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
        await updateDoc(doc(db, INVENTORY_COLLECTION, id), {
            ...updates,
            lastUpdated: Date.now(),
        });
    },

    /**
     * Elimina un articolo
     */
    async deleteItem(id: string): Promise<void> {
        await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
    },

    /**
     * Registra un movimento (Carico/Scarico) e aggiorna la giacenza.
     * PERF-02: operazione atomica via writeBatch — stock e log vengono
     * aggiornati in un'unica transazione. Se una fallisce, nessuna viene applicata.
     * Gestisce anche l'invio dell'alert email se la giacenza scende sotto la soglia.
     */
    async recordMovement(movement: Omit<InventoryMovement, 'id' | 'timestamp'>): Promise<void> {
        const { itemId, type, quantity } = movement;
        const change = type === 'in' ? quantity : -quantity;

        const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
        const movRef = doc(collection(db, MOVEMENTS_COLLECTION)); // pre-genera ID per il batch

        // 1. Aggiornamento atomico: stock + log movimento in un unico commit
        const batch = writeBatch(db);
        batch.update(itemRef, { stock: increment(change), lastUpdated: Date.now() });
        batch.set(movRef, { ...movement, timestamp: Date.now() });
        await batch.commit();

        // 2. Controllo soglia per alert email (solo se è uno scarico)
        // La lettura post-commit è separata (accettabile: serve solo per la notifica)
        if (type === 'out') {
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
                const item = itemSnap.data() as InventoryItem;
                if (item.stock < item.minThreshold) {
                    // ROB-02: Invia alert solo se non ne abbiamo mandato uno nelle ultime 24 ore
                    const lastAlert = item.lastAlertSent || 0;
                    if (Date.now() - lastAlert >= ALERT_COOLDOWN_MS) {
                        await this.sendLowStockEmail(item);
                        await updateDoc(itemRef, { lastAlertSent: Date.now() });
                    }
                }
            }
        }
    },

    /**
     * Recupera gli ultimi movimenti (log)
     */
    async fetchMovements(limitCount: number = 50): Promise<InventoryMovement[]> {
        const q = query(collection(db, MOVEMENTS_COLLECTION), orderBy('timestamp', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InventoryMovement);
    },

    /**
     * Recupera movimenti associati a un ticket o installazione
     */
    async fetchMovementsByReference(referenceId: string): Promise<InventoryMovement[]> {
        const q = query(
            collection(db, MOVEMENTS_COLLECTION),
            where('referenceId', '==', referenceId),
            orderBy('timestamp', 'desc'),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InventoryMovement);
    },

    /**
     * Interno: Invia email tramite collezione 'mail' (Firebase Trigger Email)
     */
    async sendLowStockEmail(item: InventoryItem): Promise<void> {
        try {
            // Recupera l'email configurata nelle impostazioni globali
            let recipient = 'l.fagetti@dfvautomazioni.it';
            try {
                const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
                if (settingsSnap.exists()) {
                    const sData = settingsSnap.data();
                    if (sData.inventoryEmail && sData.inventoryEmail.trim()) {
                        recipient = sData.inventoryEmail.trim();
                    }
                }
            } catch (err) {
                console.warn('[InventoryService] Impossibile recuperare email da settings, uso default:', err);
            }

            await addDoc(collection(db, MAIL_COLLECTION), {
                to: recipient,
                message: {
                    subject: `⚠️ ALERT MAGAZZINO: ${item.name} Sottoscorta`,
                    text: `L'articolo ${item.name} (Cod: ${item.code}) è sceso sotto la soglia minima di ${item.minThreshold} pezzi. Giacenza attuale: ${item.stock}.`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #d32f2f;">⚠️ Avviso Sottoscorta</h2>
                            <p>Si informa che la giacenza del seguente articolo è critica:</p>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><b>Articolo:</b></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><b>Codice:</b></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.code}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><b>Giacenza Attuale:</b></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee; color: #d32f2f; font-weight: bold;">${item.stock} ${item.unit || 'pz'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><b>Soglia Minima:</b></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.minThreshold} ${item.unit || 'pz'}</td>
                                </tr>
                            </table>
                            <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
                                Messaggio generato automaticamente dal sistema Assistenza SK.
                            </p>
                        </div>
                    `,
                },
                timestamp: Date.now(),
            });
            console.log(`📧 Richiesta email inviata a ${recipient} per ${item.name}`);
        } catch (error) {
            console.error('Errore durante la creazione del doc email:', error);
        }
    },


    /**
     * Cerca un articolo nel magazzino tramite codice o nome
     */
    async findItemByCodeOrName(code?: string, name?: string): Promise<InventoryItem | null> {
        const items = await this.fetchItems();
        const cleanCode = (code || '').trim().toLowerCase();
        const cleanName = (name || '').trim().toLowerCase();

        if (cleanCode) {
            const matchByCode = items.find((i) => (i.code || '').trim().toLowerCase() === cleanCode);
            if (matchByCode) return matchByCode;
        }

        if (cleanName) {
            const matchByName = items.find((i) => (i.name || '').trim().toLowerCase() === cleanName);
            if (matchByName) return matchByName;
        }

        return null;
    },

    /**
     * Carica direttamente a magazzino un materiale acquistato/arrivato
     */
    async loadMaterialToInventory(params: {
        code?: string;
        description: string;
        quantity: number | string;
        client?: string;
        userId: string;
        userName: string;
        targetItemId?: string;
    }): Promise<{ itemId: string; itemName: string; newStock: number; isNew: boolean }> {
        const qty = Math.max(1, Number(params.quantity) || 1);
        let item: InventoryItem | null = null;

        if (params.targetItemId) {
            const itemDoc = await getDoc(doc(db, INVENTORY_COLLECTION, params.targetItemId));
            if (itemDoc.exists()) {
                item = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;
            }
        }

        if (!item) {
            item = await this.findItemByCodeOrName(params.code, params.description);
        }

        let isNew = false;
        let itemId = '';
        let itemName = '';

        if (item && item.id) {
            itemId = item.id;
            itemName = item.name;
        } else {
            // Crea un nuovo articolo se non esistente
            isNew = true;
            itemName = params.description.trim();
            const cleanCode = (params.code || '').trim() || `ART-${Date.now().toString().slice(-5)}`;
            itemId = await this.addItem({
                code: cleanCode,
                name: itemName,
                stock: 0,
                minThreshold: 1,
                unit: 'pz',
            });
        }

        // Registra il movimento di carico 'in'
        const noteDetail = params.client ? ` (Cliente: ${params.client.trim()})` : '';
        await this.recordMovement({
            itemId,
            itemName,
            type: 'in',
            quantity: qty,
            userId: params.userId,
            userName: params.userName,
            notes: `Carico da Acquisto Materiali: ${params.description.trim()}${noteDetail}`,
        });

        // Recupera la giacenza aggiornata
        const updatedDoc = await getDoc(doc(db, INVENTORY_COLLECTION, itemId));
        const currentStock = updatedDoc.exists() ? (updatedDoc.data().stock ?? qty) : qty;

        return {
            itemId,
            itemName,
            newStock: currentStock,
            isNew,
        };
    },
};

