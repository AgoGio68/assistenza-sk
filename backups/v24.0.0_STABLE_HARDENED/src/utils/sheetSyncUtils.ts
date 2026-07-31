import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Aggiorna una singola cella nello spreadsheet in Firebase usando l'ID della riga.
 */
export const updateSheetCellById = async (sheetId: string, colIndex: number, rowId: string, value: string) => {
    const rowRef = doc(db, sheetId, rowId);
    
    // Mappa l'indice colonna nella lettera corrispondente (0 -> A, 1 -> B, ...)
    const colLetter = String.fromCharCode(65 + colIndex);

    await updateDoc(rowRef, {
        [colLetter]: value
    });
};

/**
 * Esegue il sync bidirezionale di una data.
 */
export const syncInstallationDate = async (
    stableId: string, 
    newDate: string, // Formato AAAA-MM-GG
    sheetId: 'ordini' | 'ordini_s2' = 'ordini'
) => {
    // 1. Aggiorna installation_data (Firestore Collection)
    const instRef = doc(db, 'installation_data', stableId);
    await setDoc(instRef, {
        scheduledDate: newDate,
        updatedAt: Date.now(),
        updatedBy: 'calendar_sync'
    }, { merge: true });

    // 2. Aggiorna lo spreadsheet (Collezione di righe)
    // Converti AAAA-MM-GG in GG/MM/AAAA per lo spreadsheet
    const [y, m, d] = newDate.split('-');
    const sheetDate = `${d}/${m}/${y}`;
    
    // Colonna H (indice 7) è "Data Inst."
    // Usiamo lo stableId direttamente come ID del documento della riga
    await updateSheetCellById(sheetId, 7, stableId, sheetDate);
};

/**
 * Esegue il sync dello stato di collaudo nello spreadsheet.
 */
export const syncInstallationStatus = async (
    stableId: string,
    status: 'DA COLLAUDARE' | 'COLLAUDATA' | 'RESET',
    sheetId: 'ordini' | 'ordini_s2' = 'ordini'
) => {
    const rowRef = doc(db, sheetId, stableId);
    
    if (status === 'RESET') {
        await syncResetAssignment(stableId, sheetId);
        return;
    }

    const snap = await getDoc(rowRef);
    if (snap.exists()) {
        // La Colonna I (indice 8) è "Commenti"
        // Il cliente vuole che scriviamo esattamente il testo dello stato
        await updateSheetCellById(sheetId, 8, stableId, status);
    }
};

/**
 * Rimuove chirurgicamente l'assegnazione dallo spreadsheet.
 */
export const syncResetAssignment = async (
    stableId: string,
    sheetId: 'ordini' | 'ordini_s2' = 'ordini'
) => {
    const rowRef = doc(db, sheetId, stableId);
    const snap = await getDoc(rowRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const updates: Record<string, string> = {};

    // 1. Pulisce Data Inst (Colonna H, indice 7)
    updates['H'] = '';

    // 2. Pulisce Commenti (Colonna I, indice 8)
    let currentComment = data['I'] || '';
    const cleanComment = currentComment
        .replace(/\[DA COLLAUDARE\]/gi, '')
        .replace(/\[COLLAUDATA\]/gi, '')
        .trim();
    
    updates['I'] = cleanComment;
    await updateDoc(rowRef, updates);
};
