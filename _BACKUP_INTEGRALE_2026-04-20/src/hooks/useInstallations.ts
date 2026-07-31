import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Installation } from '../types';

/* ─── Cell-coordinate helpers (mirrors SharedSheet.tsx) ─── */
function letterCol(s: string): number {
    let i = 0;
    for (let k = 0; k < s.length; k++) i = i * 26 + (s.charCodeAt(k) - 64);
    return i - 1;
}
function parseName(n: string): [number, number] {
    const m = n.match(/^([A-Z]+)(\d+)$/);
    return m ? [letterCol(m[1]), parseInt(m[2]) - 1] : [-1, -1];
}

/**
 * Converts the flat cell-map stored in Firebase by SharedSheet
 * (e.g. { "A1": "val", "B2": "val" }) into a 2D row array,
 * skipping the header row (row index 0).
 */
function cellMapToRows(map: Record<string, string>): string[][] {
    // Find max row
    let maxRow = 0;
    for (const key of Object.keys(map)) {
        const [, r] = parseName(key);
        if (r > maxRow) maxRow = r;
    }

    const COLS = 26;  // A–Z, per non troncare colonne usate per note e ID stabile
    const rows: string[][] = Array.from({ length: maxRow + 1 }, () => Array(COLS).fill(''));

    for (const [key, val] of Object.entries(map)) {
        const [c, r] = parseName(key);
        if (r >= 0 && r < rows.length && c >= 0 && c < COLS) {
            rows[r][c] = val ?? '';
        }
    }

    // Skip header row (index 0)
    return rows.slice(1);
}

export const useInstallations = (section: 'sk' | 's2', _settings: any, _isSuperadmin: boolean) => {
    const [sheetData, setSheetData] = useState<Installation[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [dbData, setDbData] = useState<Record<string, Partial<Installation>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orphanedData, setOrphanedData] = useState<Installation[]>([]);

    // 1 — Listen to the Shared Firebase Sheet (the new "Source of Truth")
    useEffect(() => {
        const sheetId = section === 's2' ? 'ordini_s2' : 'ordini';
        const sheetRef = doc(db, 'fogli_condivisi', sheetId);

        setLoading(true);
        const unsub = onSnapshot(sheetRef, (snap) => {
            if (snap.exists()) {
                const docData = snap.data() as { data: Record<string, string>, comments?: Record<string, string> };
                const cellMap = docData.data || {};

                // Convert cell-coordinate map → row arrays
                const rowArrays = cellMapToRows(cellMap);

                const mapped: Installation[] = rowArrays
                    .map((parts, index): Installation | null => {
                        if (!parts || parts.length < 5) return null;

                        const orderNumber = (parts[0] || '').trim();
                        const client = (parts[1] || '').trim();
                        const deliveryDateRaw = (parts[4] || '').trim();

                        // Skip completely empty rows
                        if (!client && !orderNumber) return null;

                        // Auto-invoiced detection: "FT" in delivery date column
                        const autoInvoiced =
                            /FT/i.test(deliveryDateRaw) ||
                            (deliveryDateRaw.includes('_') && deliveryDateRaw.length > 5);

                        // Row index in sheet = index + 2 (1-based, skipping header)
                        const rowIndex = String(index + 2);

                        const rawModelSK = (parts[5] || '').trim();

                        // Logica aggiornata v2: 
                        // 1. Se inizia con '***' o '...' è una nota al 100%.
                        // 2. Altrimenti, cerchiamo righe che iniziano con 'OCMSK'.
                        // 3. Se non ci sono righe 'OCMSK', ma il testo è lungo o multilinea, lo spostiamo in note.
                        const modelSKIsNote = rawModelSK.startsWith('***') || rawModelSK.startsWith('...');
                        
                        let modelSK = '';
                        let leftoverNote = '';

                        if (modelSKIsNote) {
                            leftoverNote = rawModelSK;
                        } else {
                            const lines = rawModelSK.split('\n');
                            const ocmskLines = lines.filter(l => l.trim().startsWith('OCMSK'));
                            const otherLines = lines.filter(l => !l.trim().startsWith('OCMSK') && l.trim() !== '');
                            
                            if (ocmskLines.length > 0) {
                                modelSK = ocmskLines.join('\n');
                                if (otherLines.length > 0) {
                                    leftoverNote = otherLines.join('\n').trim();
                                }
                            } else {
                                // Se non ci sono codici OCMSK, verifichiamo se è un codice modello breve o una nota
                                if (rawModelSK.length > 25 || lines.length > 1) {
                                    leftoverNote = rawModelSK;
                                    modelSK = '';
                                } else {
                                    modelSK = rawModelSK;
                                }
                            }
                        }

                        
                        const explicitNote = (parts[9] || '').trim();
                        
                        let extractedNotes = '';
                        // Uniamo: note esplicite colonna J + note residue colonna F (Modello SK)
                        const allNotes = [explicitNote, leftoverNote]
                            .filter(n => n.trim() !== '')
                            .join('\n\n');
                        
                        extractedNotes = allNotes;

                        return {
                            rowId: `row-${rowIndex}`,
                            orderNumber,
                            client,
                            machine: (parts[2] || '').trim(),
                            installationSite: (parts[3] || '').trim(),
                            deliveryDate: deliveryDateRaw,
                            modelSK,
                            serialSK: (parts[6] || '').trim(),
                            installDate: (parts[7] || '').trim(),
                            comments: (parts[8] || '').trim(),
                            extractedNotes,
                            originalRowIndex: rowIndex,
                            _firestoreId: parts[25]?.trim() || undefined,
                            isInvoiced: autoInvoiced,
                        } as Installation;
                    })
                    .filter((i): i is Installation => i !== null);

                setSheetData(mapped);
            } else {
                setSheetData([]);
            }
            setLoading(false);
        }, (err) => {
            console.error('[useInstallations] Snapshot error:', err);
            setError('Errore nel collegamento al database degli ordini.');
            setLoading(false);
        });

        return () => unsub();
    }, [section]);

    // 2 — Real-time listener for Firestore overrides (tested, toTest, scheduledDate, etc.)
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'installation_data'), (snap) => {
            const dataMap: Record<string, Partial<Installation>> = {};
            snap.forEach((d) => {
                dataMap[d.id] = d.data() as Partial<Installation>;
            });
            setDbData(dataMap);
        });
        return () => unsub();
    }, []);

    const generateSemanticId = (inst: Installation): string => {
        if (inst._firestoreId) return inst._firestoreId;
        const clean = (s: string) =>
            (s || '').trim().toLowerCase().replace(/\//g, '-').replace(/\s+/g, '_');
        const order = clean(inst.orderNumber);
        const client = clean(inst.client);
        const machine = clean(inst.machine);
        return `inst-${order}-${client}-${machine}`;
    };

    const loadSheetData = async () => {
        // Handled by onSnapshot — kept for backward compatibility
    };

    // 3 — Merge: Sheet rows + Local Firestore overrides
    useEffect(() => {
        const sheetIdsSeen = new Set<string>();
        const semanticCounts: Record<string, number> = {};

        const sheetMerged = sheetData
            .map((inst) => {
                let id = inst._firestoreId;
                if (!id || id.trim() === '') {
                    const baseId = generateSemanticId(inst);
                    semanticCounts[baseId] = (semanticCounts[baseId] || 0) + 1;
                    const count = semanticCounts[baseId];
                    id = count > 1 ? `${baseId}_${count}` : baseId;
                }
                sheetIdsSeen.add(id);
                const extra = dbData[id] || {};
                // Only apply non-source overrides from localOverrides
                const { scheduledDate, scheduledTime, tested, toTest, comments, isInvoiced, extractedNotes, ...safeLocalOverrides } =
                    extra.localOverrides || {};
                return {
                    ...inst,
                    ...extra,
                    ...safeLocalOverrides,
                    _firestoreId: id,
                };
            })
            .filter((inst) => !inst.isDeleted);

        const pendingManual: Installation[] = [];
        const orphans: Installation[] = [];

        Object.entries(dbData)
            .filter(([id, d]) => {
                const isCorrectSection = d.section === section || (!d.section && section === 'sk');
                const isOrphan = !sheetIdsSeen.has(id);
                const isNotDeleted = !d.isDeleted;
                return isCorrectSection && isOrphan && isNotDeleted;
            })
            .forEach(([id, d]) => {
                const client = d.client || d.localOverrides?.client;
                const machine = d.machine || d.localOverrides?.machine;
                const hasContent =
                    (client && client.trim() !== '') || (machine && machine.trim() !== '');

                if (hasContent) {
                    const instObj = {
                        ...(d as Installation),
                        ...(d.localOverrides || {}),
                        rowId: (d as any).rowId || 'manual',
                        _firestoreId: id,
                    };

                    if (d.isManual) {
                        pendingManual.push(instObj);
                    } else if (d.comments || d.tested || d.toTest || d.scheduledDate || d.applications?.length) {
                        orphans.push(instObj);
                    }
                }
            });

        setInstallations([...sheetMerged, ...pendingManual]);
        setOrphanedData(orphans);
    }, [sheetData, dbData, section]);

    const handleHardResetDB = async (activeInstallations: Installation[]) => {
        if (!_isSuperadmin) return;
        const msg =
            '⚠️ ATTENZIONE ADMINISTRATOR!\n\nSei sicuro di voler PULIRE LA CACHE DEL DATABASE (salvataggi in app) per le macchine attualmente in coda o orfane?\n\nQuesta azione CANCELLERÀ appunti interni, date manuali e flag non ancora esportati, forzando un ricalcolo pulito dal solo foglio Google.\n\nLe macchine già fatturate/storicizzate (grigie) non verranno toccate in alcun modo.\n\nVuoi procedere?';

        if (!window.confirm(msg)) return;

        try {
            const batch = writeBatch(db);
            let count = 0;

            activeInstallations.forEach((inst) => {
                if (inst._firestoreId && !inst.isManual) {
                    batch.delete(doc(db, 'installation_data', inst._firestoreId));
                    count++;
                }
            });

            orphanedData.forEach((inst) => {
                if (inst._firestoreId) {
                    batch.delete(doc(db, 'installation_data', inst._firestoreId));
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                alert(`DB ripulito con successo! Eliminati ${count} conflitti locali. La pagina si ricaricherà.`);
                window.location.reload();
            } else {
                alert('Nessun dato locale da eliminare trovato per le installazioni in corso.');
            }
        } catch (e) {
            console.error('Errore reset', e);
            alert('Errore durante la pulizia del DB!');
        }
    };

    return {
        installations,
        orphanedData,
        loading,
        error,
        dbData,
        generateSemanticId,
        loadSheetData,
        handleHardResetDB,
    };
};
