import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { fetchInstallations } from '../services/InstallationService';
import { Installation } from '../types';

export const useInstallations = (section: 'sk' | 's2', settings: any, isSuperadmin: boolean) => {
    const [sheetData, setSheetData] = useState<Installation[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [dbData, setDbData] = useState<Record<string, Partial<Installation>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [importNotified, setImportNotified] = useState(false);
    const [orphanedData, setOrphanedData] = useState<Installation[]>([]);

    const loadSheetData = async () => {
        const sheetUrl = section === 's2' ? settings.section2InstallationsSheetUrl : settings.installationsSheetUrl;

        if (!sheetUrl) {
            setSheetData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await fetchInstallations(sheetUrl);
            setSheetData(data);
        } catch (err) {
            setError(
                `Impossibile caricare i dati dal foglio. Verifica che l'URL sia corretto e il foglio sia pubblico.`,
            );
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for Firestore overrides
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'installation_data'), (snap) => {
            const dataMap: Record<string, Partial<Installation>> = {};
            snap.forEach((doc) => {
                dataMap[doc.id] = doc.data() as Partial<Installation>;
            });
            setDbData(dataMap);
        });
        return () => unsub();
    }, []);

    // Fetch on mount or setting change
    useEffect(() => {
        loadSheetData();
    }, [settings.installationsSheetUrl, settings.section2InstallationsSheetUrl, section]);

    const generateSemanticId = (inst: Installation) => {
        if (inst._firestoreId) return inst._firestoreId;

        const clean = (s: string) => (s || '').trim().toLowerCase().replace(/\//g, '-').replace(/\s+/g, '_');
        const order = clean(inst.orderNumber);
        const client = clean(inst.client);
        const machine = clean(inst.machine);
        return `inst-${order}-${client}-${machine}`;
    };

    // WhatsApp Notification
    useEffect(() => {
        if (
            settings.whatsappEnabled &&
            settings.waNotifyNewImport !== false &&
            sheetData.length > 0 &&
            !importNotified &&
            !loading
        ) {
            const isFirstLoad = installations.length === 0 && !loading;
            if (isFirstLoad) {
                setImportNotified(true);
                return;
            }

            const newItems = sheetData.filter((sheetInst) => {
                const id = generateSemanticId(sheetInst);
                return !dbData[id] && !installations.some((i) => i._firestoreId === id);
            });

            if (newItems.length > 0) {
                setImportNotified(true);
                try {
                    const body = `[IMPORTAZIONE]: Rilevate ${newItems.length} nuova/e riga/e nel foglio Google.\n\nClienti: ${newItems
                        .slice(0, 5)
                        .map((i) => i.client)
                        .join(', ')}${newItems.length > 5 ? ' e altri...' : ''}`;
                    const inviaNotifica = httpsCallable(functions, 'inviaNotificaWhatsApp');
                    inviaNotifica({ body });
                } catch (err) {
                    console.error('WA Import Notification Error:', err);
                }
            }
        }
    }, [
        sheetData,
        loading,
        settings.whatsappEnabled,
        settings.waNotifyNewImport,
        installations,
        dbData,
        importNotified,
    ]);

    // Merge Data
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
                const { scheduledDate, scheduledTime, tested, toTest, comments, isInvoiced, ...safeLocalOverrides } =
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
            .filter(([id, doc]) => {
                const isCorrectSection = doc.section === section || (!doc.section && section === 'sk');
                const isOrphan = !sheetIdsSeen.has(id);
                const isNotDeleted = !doc.isDeleted;
                return isCorrectSection && isOrphan && isNotDeleted;
            })
            .forEach(([id, doc]) => {
                const client = doc.client || doc.localOverrides?.client;
                const machine = doc.machine || doc.localOverrides?.machine;
                const hasContent = (client && client.trim() !== '') || (machine && machine.trim() !== '');

                if (hasContent) {
                    const instObj = {
                        ...(doc as Installation),
                        ...(doc.localOverrides || {}),
                        rowId: (doc as any).rowId || 'manual',
                        _firestoreId: id,
                    };

                    if (doc.isManual) {
                        pendingManual.push(instObj);
                    } else if (
                        doc.comments ||
                        doc.tested ||
                        doc.toTest ||
                        doc.scheduledDate ||
                        doc.applications?.length
                    ) {
                        orphans.push(instObj);
                    }
                }
            });

        setInstallations([...sheetMerged, ...pendingManual]);
        setOrphanedData(orphans);
    }, [sheetData, dbData, section]);

    const handleHardResetDB = async (activeInstallations: Installation[]) => {
        if (!isSuperadmin) return;
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
