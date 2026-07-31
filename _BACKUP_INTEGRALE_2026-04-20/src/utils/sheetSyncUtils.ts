import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Trova l'indice di riga (0-based) di un record nello spreadsheet Firebase
 * cercando lo Stable ID nella colonna Z (indice 25).
 */
export const findRowByStableId = async (sheetId: string, stableId: string): Promise<number | null> => {
    try {
        const sheetRef = doc(db, 'fogli_condivisi', sheetId);
        const snap = await getDoc(sheetRef);
        if (!snap.exists()) return null;

        const data = snap.data().data || {};
        // Cerchiamo in tutte le chiavi che finiscono con 25 (colonna Z)
        // Nota: cellName(25, r) genera "Z" + (r+1)
        for (const [cell, value] of Object.entries(data)) {
            if (cell.startsWith('Z') && value === stableId) {
                const rowIndex = parseInt(cell.substring(1), 10) - 1;
                return rowIndex;
            }
        }
    } catch (e) {
        console.error('[sheetSyncUtils] findRowByStableId error:', e);
    }
    return null;
};

/**
 * Aggiorna una singola cella nello spreadsheet in Firebase.
 */
export const updateSheetCell = async (sheetId: string, colIndex: number, rowIndex: number, value: string) => {
    const sheetRef = doc(db, 'fogli_condivisi', sheetId);
    
    // Helper per convertire coordinate in nome cella (es: 7, 0 -> H1)
    const colLetter = (c: number): string => {
        let s = '', n = c;
        while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
        return s;
    };
    const cellName = colLetter(colIndex) + (rowIndex + 1);

    await updateDoc(sheetRef, {
        [`data.${cellName}`]: value
    });
};

/**
 * Esegue il sync bidirezionale di una data.
 * Aggiorna sia installation_data che fogli_condivisi.
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

    // 2. Aggiorna lo spreadsheet (fogli_condivisi)
    const rowIndex = await findRowByStableId(sheetId, stableId);
    if (rowIndex !== null) {
        // Converti AAAA-MM-GG in GG/MM/AAAA per lo spreadsheet
        const [y, m, d] = newDate.split('-');
        const sheetDate = `${d}/${m}/${y}`;
        
        // Colonna H (indice 7) è "Data Inst."
        await updateSheetCell(sheetId, 7, rowIndex, sheetDate);
    }
};

/**
 * Esegue il sync dello stato di collaudo nello spreadsheet.
 * Inserisce [DA COLLAUDARE] nella colonna Commenti (I, indice 8).
 */
export const syncInstallationStatus = async (
    stableId: string,
    toTest: boolean,
    sheetId: 'ordini' | 'ordini_s2' = 'ordini'
) => {
    if (!toTest) return;

    const rowIndex = await findRowByStableId(sheetId, stableId);
    if (rowIndex !== null) {
        const sheetRef = doc(db, 'fogli_condivisi', sheetId);
        const snap = await getDoc(sheetRef);
        if (snap.exists()) {
            const data = snap.data().data || {};
            const colLetter = (c: number): string => {
                let s = '', n = c;
                while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
                return s;
            };
            // Colonna I (8) è "Commenti"
            const cellName = colLetter(8) + (rowIndex + 1);
            const currentVal = data[cellName] || '';
            
            if (!currentVal.toUpperCase().includes('DA COLLAUDARE')) {
                const newVal = `[DA COLLAUDARE] ${currentVal}`.trim();
                await updateSheetCell(sheetId, 8, rowIndex, newVal);
            }
        }
    }
};

/**
 * Rimuove chirurgicamente l'assegnazione dallo spreadsheet.
 * Pulisce la data (colonna 7) e rimuove i tag [DA COLLAUDARE]/[COLLAUDATA] (colonna 8).
 */
export const syncResetAssignment = async (
    stableId: string,
    sheetId: 'ordini' | 'ordini_s2' = 'ordini'
) => {
    const rowIndex = await findRowByStableId(sheetId, stableId);
    if (rowIndex === null) return;

    const sheetRef = doc(db, 'fogli_condivisi', sheetId);
    const snap = await getDoc(sheetRef);
    if (!snap.exists()) return;

    const data = snap.data().data || {};
    const colLetter = (c: number): string => {
        let s = '', n = c;
        while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
        return s;
    };

    const updates: Record<string, string> = {};

    // 1. Pulisce Data Inst (Colonna H, indice 7)
    const cellH = colLetter(7) + (rowIndex + 1);
    updates[`data.${cellH}`] = '';

    // 2. Pulisce Commenti (Colonna I, indice 8)
    const cellI = colLetter(8) + (rowIndex + 1);
    let currentComment = data[cellI] || '';
    
    // Rimozione chirurgica dei tag [DA COLLAUDARE] e [COLLAUDATA]
    const cleanComment = currentComment
        .replace(/\[DA COLLAUDARE\]/gi, '')
        .replace(/\[COLLAUDATA\]/gi, '')
        .trim();
    
    updates[`data.${cellI}`] = cleanComment;

    await updateDoc(sheetRef, updates);
};
