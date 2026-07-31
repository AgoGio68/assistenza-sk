import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Installation } from '../types';

export const useInstallations = (section: 'sk' | 's2', _settings: any, _isSuperadmin: boolean) => {
    const [sheetData, setSheetData] = useState<Installation[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [dbData, setDbData] = useState<Record<string, Partial<Installation>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orphanedData, setOrphanedData] = useState<Installation[]>([]);

    // 1 — Listen to the Shared Firebase Collection (New PK System)
    useEffect(() => {
        const sheetId = section === 's2' ? 'ordini_s2' : 'ordini';
        const collRef = collection(db, sheetId);

        setLoading(true);
        const unsub = onSnapshot(collRef, (snapshot) => {
            const mapped = snapshot.docs.map((docSnap) => {
                const d = docSnap.data();
                
                const orderNumber = (d['A'] || '').trim();
                const client = (d['B'] || '').trim();
                const fatturazioneRaw = (d['E'] || d['data_cons'] || '').trim().toUpperCase();
                const deliveryDateRaw = (d['dataEffettivaConsegna'] || d['L'] || '').trim();
                const rowIndex = d.rowIndex || 0;

                const autoInvoiced = fatturazioneRaw.includes("FT");

                const rawModelSK = (d['F'] || '').trim();
                const modelSKIsNote = rawModelSK.startsWith('***') || rawModelSK.startsWith('...');
                
                let modelSK = '';
                let leftoverNote = '';

                if (modelSKIsNote) {
                    leftoverNote = rawModelSK;
                } else {
                    const lines = rawModelSK.split('\n');
                    const ocmskLines = lines.filter((l: string) => l.trim().startsWith('OCMSK'));
                    const otherLines = lines.filter((l: string) => !l.trim().startsWith('OCMSK') && l.trim() !== '');
                    
                    if (ocmskLines.length > 0) {
                        modelSK = ocmskLines.join('\n');
                        if (otherLines.length > 0) {
                            leftoverNote = otherLines.join('\n').trim();
                        }
                    } else {
                        if (rawModelSK.length > 25 || lines.length > 1) {
                            leftoverNote = rawModelSK;
                            modelSK = '';
                        } else {
                            modelSK = rawModelSK;
                        }
                    }
                }

                const explicitNote = (d['J'] || '').trim();
                const extractedNotes = [explicitNote, leftoverNote]
                    .filter(n => n.trim() !== '')
                    .join('\n\n');

                return {
                    rowId: `row-${rowIndex + 1}`,
                    orderNumber,
                    client,
                    machine: (d['C'] || '').trim(),
                    installationSite: (d['D'] || '').trim(),
                    deliveryDate: deliveryDateRaw,
                    modelSK,
                    serialSK: (d['G'] || '').trim(),
                    installDate: (d['H'] || '').trim(),
                    comments: (d['I'] || '').trim(),
                    extractedNotes,
                    originalRowIndex: String(rowIndex + 1),
                    _firestoreId: docSnap.id,
                    isInvoiced: autoInvoiced,
                } as Installation;
            })
            .filter(i => i.client || i.orderNumber);

            setSheetData(mapped);
            setLoading(false);
        }, (err) => {
            console.error('[useInstallations] Snapshot error:', err);
            setError('Errore nel collegamento al database degli ordini.');
            setLoading(false);
        });

        return () => unsub();
    }, [section]);

    // 2 — Real-time listener for Firestore overrides
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
                const { scheduledDate, scheduledTime, tested, toTest, comments, isInvoiced, extractedNotes, ...safeLocalOverrides } =
                    extra.localOverrides || {};
                return {
                    ...inst,
                    ...extra,
                    isInvoiced: inst.isInvoiced,
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
            '⚠️ ATTENZIONE ADMINISTRATOR!\n\nSei sicuro di voler PULIRE LA CACHE DEL DATABASE (salvataggi in app) per le macchine attualmente in coda o orfane?\in\nQuesta azione CANCELLERÀ appunti interni, date manuali e flag non ancora esportati, forzando un ricalcolo pulito dal solo foglio Google.\n\nLe macchine già fatturate/storicizzate (grigie) non verranno toccate in alcun modo.\n\nVuoi procedere?';

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
