/**
 * RapportiniService — Operazioni sul Realtime Database di rapportini-dfv
 *
 * Usa la seconda istanza Firebase (rapportini-dfv) per leggere/scrivere
 * i rapportini condivisi tra assistenza-sk e l'app rapportini-dfv standalone.
 */
import {
    ref,
    push,
    update,
    remove,
    onValue,
    off,
    query as dbQuery,
    limitToLast,
    orderByChild,
} from 'firebase/database';
import {
    ref as storageRef,
    uploadString,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { rapportiniDb, rapportiniStorage } from '../firebase-rapportini';

// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface Rapportino {
    id: string;
    tecnico: string;
    fotoUrl: string;
    stato: 'nuovo' | 'processato';
    data: string;
    timestamp: number;
    note?: string;
    lavorato?: boolean;
    operatoreGestione?: string;
    attesa?: boolean;
    dataProcesso?: string;
}

// ─── Compressione immagine (client-side) ─────────────────────────────────────

/**
 * Comprime un File immagine a max 1000px e qualità JPEG 0.6.
 * Restituisce una data URL base64 pronta per l'upload.
 */
export function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target!.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 1000;
                let w = img.width;
                let h = img.height;
                if (w > h) {
                    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                } else {
                    if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// ─── Invio rapportino ────────────────────────────────────────────────────────

/**
 * Invia un rapportino: comprime l'immagine, carica su Storage di rapportini-dfv,
 * poi salva il record nel Realtime DB. Restituisce la chiave generata.
 */
export async function inviaRapportino(file: File, nomeTecnico: string): Promise<string> {
    const base64 = await compressImage(file);
    const fileName = `foto/foto_${Date.now()}.jpg`;
    const photoRef = storageRef(rapportiniStorage, fileName);

    // Carica la foto su Storage
    await uploadString(photoRef, base64, 'data_url');
    const fotoUrl = await getDownloadURL(photoRef);

    // Salva il record nel Realtime DB
    const rapportiniRef = ref(rapportiniDb, 'rapportini');
    const snap = await push(rapportiniRef, {
        tecnico: nomeTecnico,
        fotoUrl,
        stato: 'nuovo',
        data: new Date().toLocaleString('it-IT'),
        timestamp: Date.now(),
    });

    return snap.key!;
}

// ─── Aggiornamento dati ──────────────────────────────────────────────────────

export function aggiornaRapportino(id: string, data: Partial<Omit<Rapportino, 'id'>>): Promise<void> {
    return update(ref(rapportiniDb, `rapportini/${id}`), data);
}

export function eliminaRapportino(id: string, fotoUrl?: string): Promise<void> {
    const cancellaDb = () => remove(ref(rapportiniDb, `rapportini/${id}`));

    if (fotoUrl) {
        try {
            const fileRef = storageRef(rapportiniStorage, fotoUrl);
            return deleteObject(fileRef)
                .then(cancellaDb)
                .catch(() => cancellaDb()); // Se la foto non c'è più, cancella comunque il record
        } catch {
            return cancellaDb();
        }
    }
    return cancellaDb();
}

// ─── Listener real-time ──────────────────────────────────────────────────────

/**
 * Sottoscrive in real-time alla lista rapportini (ultimi `limit`).
 * Restituisce una funzione di cleanup da chiamare per disiscriversi.
 */
export function subscribeRapportini(
    limit: number,
    callback: (lista: Rapportino[]) => void,
): () => void {
    const q = dbQuery(
        ref(rapportiniDb, 'rapportini'),
        orderByChild('timestamp'),
        limitToLast(limit),
    );

    const handler = (snap: any) => {
        const lista: Rapportino[] = [];
        snap.forEach((child: any) => {
            const r = child.val();
            r.id = child.key;
            r.tecnicoDisp = r.tecnico || r.utente || 'N/A';
            lista.push(r);
        });
        // Ordina: prima gli "in attesa", poi per timestamp desc
        lista.sort((a, b) => {
            if (a.attesa === b.attesa) return (b.timestamp || 0) - (a.timestamp || 0);
            return a.attesa ? 1 : -1;
        });
        callback(lista);
    };

    onValue(q, handler);
    return () => off(q, 'value', handler);
}

/**
 * Sottoscrive in real-time ai rapportini di un singolo tecnico (storico persona).
 */
export function subscribeRapportiniByTecnico(
    nomeTecnico: string,
    limit: number,
    callback: (lista: Rapportino[]) => void,
): () => void {
    const q = dbQuery(
        ref(rapportiniDb, 'rapportini'),
        orderByChild('timestamp'),
        limitToLast(limit),
    );

    const handler = (snap: any) => {
        const lista: Rapportino[] = [];
        snap.forEach((child: any) => {
            const r = child.val();
            if (r.tecnico === nomeTecnico) {
                r.id = child.key;
                lista.push(r);
            }
        });
        lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(lista);
    };

    onValue(q, handler);
    return () => off(q, 'value', handler);
}
