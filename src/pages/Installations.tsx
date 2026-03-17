import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchInstallations, updateInstallationOnSheet, appendInstallationToSheet, deleteInstallationFromSheet } from '../services/InstallationService';
import { Installation } from '../types';
import { Truck, Calendar, Box, AlertTriangle, RefreshCw, X, Save, MessageSquare, Trash2, CheckCircle2, DollarSign, ListChecks, ArrowDownWideNarrow, MapPin, User, Link as LinkIcon, PlusCircle } from 'lucide-react';
import { setDoc, collection, onSnapshot, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { createGoogleCalendarEvent, formatTicketToEvent, CalendarEvent } from '../utils/calendarUtils';

interface InstallationsProps {
    section?: 'sk' | 's2';
}

export const Installations: React.FC<InstallationsProps> = ({ section = 'sk' }) => {
    const { settings } = useSettings();
    const { isSuperadmin, isAdmin, googleToken, connectGoogle } = useAuth();
    const [sheetData, setSheetData] = useState<Installation[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [dbData, setDbData] = useState<Record<string, Partial<Installation>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortVerifiedAtBottom, setSortVerifiedAtBottom] = useState(true);

    const fieldConfig = section === 's2'
        ? ((settings as any).section2InstallationsFields || {})
        : {
            showModelSK: true,
            showSerialSK: true,
            showOrderNumber: true,
            showOrderDfv: true,
            showPlanning: true,
            showModules: true,
            showExtractedNotes: true,
            showTechnicalNotes: true
        };

    // Modal & Note State
    const [selectedInst, setSelectedInst] = useState<Installation | null>(null);
    const [editData, setEditData] = useState<Partial<Installation>>({});
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
    const [exportToSheet, setExportToSheet] = useState(false);

    // Dati Orfani
    const [orphanedData, setOrphanedData] = useState<Installation[]>([]);
    const [showOrphanVault, setShowOrphanVault] = useState(false);
    const [orphanToRelink, setOrphanToRelink] = useState<Installation | null>(null);
    const [relinkTargetId, setRelinkTargetId] = useState('');

    // Load Google Sheets Data
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
            setError(`Impossibile caricare i dati dal foglio. Verifica che l'URL sia corretto e il foglio sia pubblico.`);
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for Firestore overrides
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'installation_data'), (snap) => {
            const dataMap: Record<string, Partial<Installation>> = {};
            snap.forEach(doc => {
                dataMap[doc.id] = doc.data() as Partial<Installation>;
            });
            setDbData(dataMap);
        });
        return () => unsub();
    }, []);

    // Ricarichiamo i dati se cambia la configurazione dell'URL pertinente
    useEffect(() => {
        loadSheetData();
    }, [settings.installationsSheetUrl, settings.section2InstallationsSheetUrl, section]);

    // v3.1.10: ID Semantico Puro o ID Stabile da Colonna Z
    const generateSemanticId = (inst: Installation) => {
        if (inst._firestoreId) return inst._firestoreId; // Priorità ID Stabile colonna Z

        const clean = (s: string) => (s || '').trim().toLowerCase()
            .replace(/\//g, '-')   
            .replace(/\s+/g, '_');
        const order = clean(inst.orderNumber);
        const client = clean(inst.client);
        const machine = clean(inst.machine);
        // Costruzione HASH puramente sui dati, senza indice di riga!
        return `inst-${order}-${client}-${machine}`;
    };

    // Merge Sheet Data with Firestore Data
    useEffect(() => {
        // 1. Elaboriamo i dati del foglio (Sheet Data)
        const sheetIdsSeen = new Set<string>();
        const semanticCounts: Record<string, number> = {};

        const sheetMerged = sheetData.map(inst => {
            let id = inst._firestoreId;

            if (!id || id.trim() === '') {
                const baseId = generateSemanticId(inst);
                semanticCounts[baseId] = (semanticCounts[baseId] || 0) + 1;
                const count = semanticCounts[baseId];
                // Gestione duplicati: suffix solo dal secondo elemento uguale in poi
                id = count > 1 ? `${baseId}_${count}` : baseId;
            }

            sheetIdsSeen.add(id);
            const extra = dbData[id] || {};
            return {
                ...inst,
                ...extra,
                ...(extra.localOverrides || {}),
                _firestoreId: id // Assicuriamoci che l'ID calcolato sia scritto qui per l'intero lifecycle
            };
        }).filter(inst => !inst.isDeleted);

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
                        _firestoreId: id
                    };
                    
                    if (doc.isManual) {
                        pendingManual.push(instObj);
                    } else if (doc.comments || doc.tested || doc.toTest || doc.scheduledDate || doc.applications?.length) {
                        orphans.push(instObj);
                    }
                }
            });

        setInstallations([...sheetMerged, ...pendingManual]);
        setOrphanedData(orphans);
    }, [sheetData, dbData, section]);

    const handleAddManual = () => {
        const newId = `manual-${Date.now()}`;
        const mockInst: Installation = {
            rowId: 'manual',
            orderNumber: '',
            client: '',
            machine: '',
            modelSK: '',
            serialSK: '',
            deliveryDate: new Date().toISOString().split('T')[0],
            installationSite: '',
            installDate: '',
            comments: '',
            isManual: true,
            section: section,
            _firestoreId: newId,
            createdAt: Date.now()
        };
        setSelectedInst(mockInst);
        setEditData({
            isManual: true,
            section: section,
            comments: '',
            isInvoiced: false,
            toTest: false,
            tested: false,
            scheduledTime: '',
            scheduledDate: '',
            applications: [],
            localOverrides: {
                 client: '',
                 machine: '',
                 modelSK: '',
                 serialSK: '',
                 orderDfv: '',
                 installationSite: ''
            }
        });
        setDeleteConfirm(false);
    };

    const handleOpenDetail = (inst: Installation) => {
        setSelectedInst(inst);
        setEditData({
            comments: inst.comments || '',
            isInvoiced: inst.isInvoiced || false,
            toTest: inst.toTest || false,
            tested: inst.tested || false,
            scheduledTime: inst.scheduledTime || '',
            scheduledDate: inst.scheduledDate || '',
            applications: inst.applications || [],
            localOverrides: inst.localOverrides || {}
        });
        setDeleteConfirm(false);
        setExportToSheet(false);
    };

    const handleSave = async () => {
        if (!selectedInst) return;
        setSaving(true);
        try {
            const sheetUrl = section === 's2' ? settings.section2InstallationsSheetUrl : settings.installationsSheetUrl;
            let finalDocId = selectedInst._firestoreId || generateSemanticId(selectedInst);
            let mergedEditData = { ...editData };

            // Esportazione nuovo record manuale in Google Sheets
            if (selectedInst.isManual && exportToSheet && googleToken && sheetUrl) {
                const combinedData = { ...selectedInst, ...editData, ...editData.localOverrides } as Installation;
                const newRowIndex = await appendInstallationToSheet(
                    sheetUrl, 
                    googleToken, 
                    combinedData, 
                    settings.insertInstallationsAtTop
                );
                
                if (newRowIndex) {
                    mergedEditData.isManual = false;
                    mergedEditData.originalRowIndex = newRowIndex;
                    // Manteniamo lo STESSO firestoreId per non far sparire l'item durante la latenza
                    finalDocId = selectedInst._firestoreId || finalDocId; 
                }
            }

            const docRef = doc(db, 'installation_data', finalDocId as string);

            // 1. Salvataggio su Firestore (sempre eseguito)
            await setDoc(docRef, {
                ...mergedEditData,
                updatedAt: Date.now(),
                updatedBy: isAdmin ? 'admin' : 'superadmin'
            }, { merge: true });

            // 2. Sincronizzazione con Google Sheets (Opzionale, sulle modifiche di record già esistenti sul foglio)
            // Usiamo mergedEditData.originalRowIndex nel caso lo abbiamo appena esportato!
            const targetRowIndex = mergedEditData.originalRowIndex || selectedInst.originalRowIndex;
            if (googleToken && targetRowIndex && !mergedEditData.isManual && !exportToSheet) {
                const statusComment = editData.tested
                    ? "[COLLAUDATA]"
                    : (editData.toTest ? "[DA COLLAUDARE]" : "");

                let cleanComments = editData.comments || "";
                // Rimuoviamo tag esistenti per evitare duplicazioni (sostituzione)
                cleanComments = cleanComments.replace(/\[COLLAUDATA\]/gi, "").replace(/\[DA COLLAUDARE\]/gi, "").trim();

                const finalComments = statusComment
                    ? `${statusComment} ${cleanComments}`.trim()
                    : cleanComments;

                try {
                    await updateInstallationOnSheet(
                        sheetUrl || '',
                        googleToken,
                        targetRowIndex,
                        {
                            installDate: editData.scheduledDate || selectedInst.deliveryDate,
                            serialSK: editData.localOverrides?.serialSK ?? selectedInst.serialSK,
                            comments: finalComments,
                            tested: editData.tested
                        }
                    );
                } catch (sheetErr: any) {
                    console.error("Sheet sync error:", sheetErr);
                    // Non blocchiamo l'utente se la sincronizzazione fallisce (es. token scaduto), ma lo avvisiamo
                    alert(`Attenzione: Dati salvati nell'App, ma la sincronizzazione col foglio Google è fallita: ${sheetErr.message}`);
                }
            }

            alert("Modifiche salvate con successo!");
            setSelectedInst(null);
        } catch (err) {
            console.error("Save error:", err);
            alert("Errore durante il salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedInst) return;
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
        }

        setSaving(true);
        try {
            const id = selectedInst._firestoreId || generateSemanticId(selectedInst);
            const docRef = doc(db, 'installation_data', id);
            const sheetUrl = section === 's2' ? settings.section2InstallationsSheetUrl : settings.installationsSheetUrl;

            // 1. Permanent removal from Sheets if present
            if (googleToken && selectedInst.originalRowIndex && sheetUrl) {
                try {
                    await deleteInstallationFromSheet(sheetUrl, googleToken, selectedInst.originalRowIndex);
                } catch (sheetErr) {
                    console.error("Sheet delete error:", sheetErr);
                    // We don't block the user, but log it
                }
            }

            // 2. Permanent removal from Firestore
            await deleteDoc(docRef);
            
            alert("Installazione eliminata definitivamente.");
            setSelectedInst(null);
        } catch (err) {
            console.error("Delete error:", err);
            alert("Errore durante l'eliminazione.");
        } finally {
            setSaving(false);
        }
    };

    const handleHardResetDB = async () => {
        if (!isSuperadmin) return;
        const msg = "⚠️ ATTENZIONE ADMINISTRATOR!\n\nSei sicuro di voler PULIRE LA CACHE DEL DATABASE (salvataggi in app) per le macchine attualmente in coda o orfane?\n\nQuesta azione CANCELLERÀ appunti interni, date manuali e flag non ancora esportati, forzando un ricalcolo pulito dal solo foglio Google.\n\nLe macchine già fatturate/storicizzate (grigie) non verranno toccate in alcun modo.\n\nVuoi procedere?";
        
        if (!window.confirm(msg)) return;

        try {
            const batch = writeBatch(db);
            let count = 0;

            activeInstallations.forEach(inst => {
                if (inst._firestoreId && !inst.isManual) {
                    batch.delete(doc(db, 'installation_data', inst._firestoreId));
                    count++;
                }
            });

            orphanedData.forEach(inst => {
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
                alert("Nessun dato locale da eliminare trovato per le installazioni in corso.");
            }
        } catch (e) {
            console.error("Errore reset", e);
            alert("Errore durante la pulizia del DB!");
        }
    };

    const handleAddEventToCalendar = async () => {
        if (!googleToken) {
            connectGoogle();
            return;
        }
        if (!editData.scheduledDate) {
            alert('Inserisci una data di installazione per creare l\'evento su Google Calendar.');
            return;
        }

        setIsSyncingCalendar(true);
        try {
            // Build scheduled datetime string
            const dateStr = editData.scheduledDate;
            const timeStr = editData.scheduledTime || '08:00';
            const scheduledDateTime = new Date(`${dateStr}T${timeStr}`);

            // Gather context data for the event
            const clientName = editData.localOverrides?.client ?? selectedInst?.client ?? 'Cliente Sconosciuto';
            const machineName = editData.localOverrides?.machine ?? selectedInst?.machine ?? 'Macchina Sconosciuta';
            const locationStr = editData.localOverrides?.installationSite ?? selectedInst?.installationSite ?? '';

            const descriptionText = `Installazione: ${machineName}\nOrdine: ${selectedInst?.orderNumber || ''}\nMatricola: ${editData.localOverrides?.serialSK ?? selectedInst?.serialSK ?? ''}`;

            const googleEventTitle = locationStr ? `${clientName} - ${locationStr}` : clientName;

            const googleEvent: CalendarEvent = formatTicketToEvent(
                googleEventTitle,
                descriptionText,
                scheduledDateTime,
                window.location.origin
            );

            if (locationStr) {
                googleEvent.location = locationStr;
            }

            await createGoogleCalendarEvent(googleToken, googleEvent);

            // Auto-salvataggio su Firebase per evitare che la data vada persa
            if (selectedInst) {
                const id = generateSemanticId(selectedInst);
                const docRef = doc(db, 'installation_data', id);
                await setDoc(docRef, {
                    ...editData,
                    updatedAt: Date.now(),
                    updatedBy: isAdmin ? 'admin' : 'superadmin'
                }, { merge: true });
            }

            alert('Evento aggiunto a Google Calendar e data salvata con successo!');
            // Chiudiamo il modale per confermare l'azione completata
            setSelectedInst(null);

        } catch (error: any) {
            console.error('Google Calendar Sync Error:', error);
            alert(`Errore durante la sincronizzazione con Google Calendar: ${error.message}`);
        } finally {
            setIsSyncingCalendar(false);
        }
    };


    const getCardColor = (inst: Installation) => {
        if (inst.isInvoiced) return '#94a3b8'; // Grigio ardesia per fatturato
        if (inst.tested) return 'var(--success-color)';
        if (inst.toTest) return '#facc15';
        return 'var(--secondary-color)';
    };

    // Determinazione del tipo di "Glow" (lampeggio)
    // Priorità: Verde > Giallo > Arancione > Blu(null)
    // Le spunte manuali (tested, toTest) sono INDIPENDENTI dalla data.
    const getGlowType = (inst: Installation): 'orange' | 'yellow' | 'green' | null => {
        if (inst.isInvoiced) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const parseAnyDate = (dateStr: string | undefined): Date | null => {
            if (!dateStr) return null;
            // Gestione YYYY-MM-DD
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    let y = parseInt(parts[0]);
                    if (y < 100) y += 2000;
                    return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
            }
            // Gestione DD/MM/YYYY o DD/MM/YY
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const d = parseInt(parts[0]);
                    const m = parseInt(parts[1]);
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000;
                    return new Date(y, m - 1, d);
                }
            }
            return null;
        };

        // 1. VERDE: Collaudata (azione manuale, massima priorità dopo fatturato)
        if (inst.tested) return 'green';

        // 2. GIALLO: Da collaudare (azione manuale, indipendente dalla data)
        if (inst.toTest) return 'yellow';

        // 3. ARANCIONE: Nessuna spunta manuale, ma ha una data pianificata oggi o in futuro
        const sDate = parseAnyDate(inst.scheduledDate);
        const iDate = parseAnyDate(inst.installDate);
        
        const hasValidFutureDate = (sDate && sDate >= now) || (iDate && iDate >= now);
        
        if (hasValidFutureDate) return 'orange';

        // 4. BLU (null): tutto fermo, nessun flag, nessuna data
        return null;
    };

    const handleRelink = async (orphanId: string, targetId: string) => {
        if (!targetId || !orphanId) return;
        try {
            const orphan = orphanedData.find(o => o._firestoreId === orphanId);
            if (!orphan) return;

            const targetRef = doc(db, 'installation_data', targetId);
            const orphanRef = doc(db, 'installation_data', orphanId);

            await setDoc(targetRef, {
                comments: orphan.comments,
                tested: orphan.tested,
                toTest: orphan.toTest,
                scheduledDate: orphan.scheduledDate,
                scheduledTime: orphan.scheduledTime,
                applications: orphan.applications,
                updatedAt: Date.now(),
                updatedBy: 'admin_relink'
            }, { merge: true });

            await setDoc(orphanRef, { isDeleted: true }, { merge: true });
            
            setOrphanToRelink(null);
            setRelinkTargetId('');
            if (orphanedData.length <= 1) setShowOrphanVault(false);
        } catch(err) {
            console.error(err);
            alert("Errore durante il recupero dei dati.");
        }
    };

    const filteredInstallations = [...installations]
        .filter((inst: Installation) => {
            if (!inst) return false;
            const search = (searchTerm || '').toLowerCase();
            const client = (inst.client || '').toLowerCase();
            const machine = (inst.machine || '').toLowerCase();
            const serial = (inst.serialSK || '').toLowerCase();
            const model = (inst.modelSK || '').toLowerCase();
            const site = (inst.installationSite || '').toLowerCase();
            const order = (inst.orderNumber || '').toLowerCase();
            
            return (
                client.includes(search) ||
                machine.includes(search) ||
                serial.includes(search) ||
                model.includes(search) ||
                site.includes(search) ||
                order.includes(search)
            );
        });

    const activeInstallations = filteredInstallations
        .filter((inst: Installation) => !inst.isInvoiced)
        .sort((a: Installation, b: Installation) => {
            const glowA = getGlowType(a);
            const glowB = getGlowType(b);

            // Gerarchia ordine: Arancione → Blu(null) → Giallo → Verde
            const priority = (glow: 'orange' | 'yellow' | 'green' | null): number => {
                if (glow === 'orange') return 0;
                if (glow === null) return 1; // Blu: tutto fermo
                if (glow === 'yellow') return 2; // Da collaudare
                if (glow === 'green') return 3; // Collaudata
                return 4;
            };

            const diff = priority(glowA) - priority(glowB);
            if (diff !== 0) return diff;

            // A parità di stato, ordine alfabetico per Cliente
            const aClient = a.client || '';
            const bClient = b.client || '';
            return aClient.toLowerCase().localeCompare(bClient.toLowerCase());
        });

    const invoicedInstallations = filteredInstallations.filter((inst: Installation) => inst.isInvoiced);

    const isSectionEnabled = section === 's2' ? settings.section2InstallationsEnabled : settings.enableInstallations;

    if (!isSectionEnabled && !isSuperadmin) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                <AlertTriangle size={48} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                <h3>Sezione non abilitata</h3>
                <p>La gestione installazioni non è attiva al momento o non hai i permessi per vederla.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={28} /> Gestione Installazioni
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Blu: In attesa | Giallo: Da collaudare | Verde: Collaudata
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <ArrowDownWideNarrow size={18} />
                        <span className="hide-mobile">Sposta collaudate in fondo:</span>
                        <input
                            type="checkbox"
                            checked={sortVerifiedAtBottom}
                            onChange={e => setSortVerifiedAtBottom(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                    </div>
                    {isAdmin && orphanedData.length > 0 && (
                        <button
                            onClick={() => setShowOrphanVault(true)}
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: 'var(--border-radius-sm)', fontWeight: 600 }}
                        >
                            <AlertTriangle size={15} /> <span className="hide-mobile">Dati Scollegati ({orphanedData.length})</span>
                        </button>
                    )}
                    {isSuperadmin && (
                        <button onClick={handleHardResetDB} className="btn" title="Pulisci Cache DB Firestore per le installazioni non fatturate" style={{ padding: '0.5rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            <Trash2 size={16} /> <span className="hide-mobile" style={{fontSize: '0.85rem', fontWeight: 600}}>Fix</span>
                        </button>
                    )}
                    <button onClick={handleAddManual} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
                        <PlusCircle size={18} /> <span className="hide-mobile">Nuova</span>
                    </button>
                    <button onClick={loadSheetData} className="btn" disabled={loading} title="Ricarica dal foglio connesso">
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Cerca cliente, macchina, matricola o ordine..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={40} className="spin" style={{ color: 'var(--secondary-color)' }} />
                    <p>Caricamento...</p>
                </div>
            ) : error ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--danger-color)', marginBottom: '1rem' }} />
                    <p>{error}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {/* Sezione Attive */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Box size={20} /> Installazioni Attive ({activeInstallations.length})
                        </h4>
                        <div style={
                            (settings as any).installationsLayoutMode === 'list-2col'
                                ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '0.75rem' }
                                : (settings as any).installationsLayoutMode === 'list'
                                    ? { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
                                : (settings as any).installationsLayoutMode === 'grid-compact'
                                    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: '0.75rem' }
                                    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }
                        }>
                            {activeInstallations.map((inst: Installation) => (
                                ((settings as any).installationsLayoutMode === 'list' || (settings as any).installationsLayoutMode === 'list-2col') ? (
                                    /* Layout a Lista Compatta */
                                    <div
                                        key={generateSemanticId(inst)}
                                        onClick={() => handleOpenDetail(inst)}
                                        className={`glass-panel card-hover ${getGlowType(inst) ? `glow-${getGlowType(inst)}` : ''}`}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderLeft: `6px solid ${getCardColor(inst)}`,
                                            cursor: 'pointer',
                                            display: 'grid',
                                            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.25fr) auto',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            transition: 'transform 0.1s, box-shadow 0.1s, border-color 0.2s',
                                            ...(getGlowType(inst) === 'orange' ? {
                                                animation: 'glowPulseOrange 2s infinite',
                                                borderColor: 'rgba(249, 115, 22, 0.5)'
                                            } : getGlowType(inst) === 'yellow' ? {
                                                animation: 'glowPulseYellow 2s infinite',
                                                borderColor: 'rgba(234, 179, 8, 0.5)'
                                            } : getGlowType(inst) === 'green' ? {
                                                animation: 'glowPulseGreen 2s infinite',
                                                borderColor: 'rgba(16, 185, 129, 0.5)'
                                            } : {})
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {inst.client}
                                                {inst.installationSite && (
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                                                        {' - '}{inst.installationSite}
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            <Box size={14} style={{ flexShrink: 0 }} /> <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.machine}</strong>
                                        </div>
                                        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                                            <Calendar size={14} /> <span style={{ whiteSpace: 'nowrap' }}>{inst.scheduledDate || inst.deliveryDate} {inst.scheduledTime && `alle ${inst.scheduledTime}`}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                            {inst.comments && <MessageSquare size={16} color="var(--text-secondary)" />}
                                            {inst.applications?.some(a => a.checked) && <ListChecks size={16} color="var(--success-color)" />}
                                        </div>
                                    </div>
                                ) : (settings as any).installationsLayoutMode === 'grid-compact' ? (
                                    /* Layout a Griglia Compatta */
                                    <div
                                        key={generateSemanticId(inst)}
                                        onClick={() => handleOpenDetail(inst)}
                                        className={`glass-panel card-hover ${getGlowType(inst) ? `glow-${getGlowType(inst)}` : ''}`}
                                        style={{
                                            padding: '0.75rem',
                                            borderLeft: `5px solid ${getCardColor(inst)}`,
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                            position: 'relative',
                                            ...(getGlowType(inst) === 'orange' ? {
                                                animation: 'glowPulseOrange 2s infinite',
                                                borderColor: 'rgba(249, 115, 22, 0.5)'
                                            } : getGlowType(inst) === 'yellow' ? {
                                                animation: 'glowPulseYellow 2s infinite',
                                                borderColor: 'rgba(234, 179, 8, 0.5)'
                                            } : getGlowType(inst) === 'green' ? {
                                                animation: 'glowPulseGreen 2s infinite',
                                                borderColor: 'rgba(16, 185, 129, 0.5)'
                                            } : {})
                                        }}
                                    >
                                        <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {inst.client}
                                        </h3>
                                        <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                                                <Box size={12} style={{ flexShrink: 0 }} /> <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.machine}</strong>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                                                <Calendar size={12} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.scheduledDate || inst.deliveryDate}</span>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ord. {inst.orderNumber}</span>
                                            <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                                {inst.comments && <MessageSquare size={12} color="currentcolor" />}
                                                {inst.applications?.some(a => a.checked) && <ListChecks size={12} color="var(--success-color)" />}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Layout a Griglia Standard */
                                    <div
                                        key={generateSemanticId(inst)}
                                        onClick={() => handleOpenDetail(inst)}
                                        className={`glass-panel card-hover ${getGlowType(inst) ? `glow-${getGlowType(inst)}` : ''}`}
                                        style={{
                                            padding: '1.25rem',
                                            borderLeft: `6px solid ${getCardColor(inst)}`,
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                            position: 'relative',
                                            ...(getGlowType(inst) === 'orange' ? {
                                                animation: 'glowPulseOrange 2s infinite',
                                                borderColor: 'rgba(249, 115, 22, 0.5)'
                                            } : getGlowType(inst) === 'yellow' ? {
                                                animation: 'glowPulseYellow 2s infinite',
                                                borderColor: 'rgba(234, 179, 8, 0.5)'
                                            } : getGlowType(inst) === 'green' ? {
                                                animation: 'glowPulseGreen 2s infinite',
                                                borderColor: 'rgba(16, 185, 129, 0.5)'
                                            } : {})
                                        }}
                                    >
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                                            {inst.client}
                                            {inst.installationSite && (
                                                <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                                                    {' - '}{inst.installationSite}
                                                </span>
                                            )}
                                        </h3>
                                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Box size={14} /> <strong>{inst.machine}</strong>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Calendar size={14} /> {inst.scheduledDate || inst.deliveryDate} {inst.scheduledTime && `alle ${inst.scheduledTime}`}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Ordine {inst.orderNumber}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {inst.comments && <MessageSquare size={14} />}
                                                {inst.applications?.some(a => a.checked) && <ListChecks size={14} color="var(--success-color)" />}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                    {/* Sezione Fatturate (Grigio) */}
                    {invoicedInstallations.length > 0 && (
                        <div>
                            <h4 style={{ marginBottom: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={20} /> Installazioni Fatturate ({invoicedInstallations.length})
                            </h4>
                            <div style={
                                (settings as any).installationsLayoutMode === 'list-2col'
                                    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '0.75rem' }
                                    : (settings as any).installationsLayoutMode === 'list'
                                        ? { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
                                        : (settings as any).installationsLayoutMode === 'grid-compact'
                                            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: '0.75rem' }
                                            : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }
                            }>
                                {invoicedInstallations.map((inst: Installation) => (
                                    ((settings as any).installationsLayoutMode === 'list' || (settings as any).installationsLayoutMode === 'list-2col') ? (
                                        /* Layout a Lista Compatta */
                                        <div
                                            key={generateSemanticId(inst)}
                                            onClick={() => handleOpenDetail(inst)}
                                            className="glass-panel"
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderLeft: `6px solid ${getCardColor(inst)}`,
                                                cursor: 'pointer',
                                                display: 'grid',
                                                gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.25fr) auto',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                opacity: 0.8,
                                                backgroundColor: '#f8fafc'
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {inst.client}
                                                    {inst.installationSite && (
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.8 }}>
                                                            {' - '}{inst.installationSite}
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                                                <Box size={14} style={{ flexShrink: 0 }} /> <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.machine}</strong>
                                            </div>
                                            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                                                <Calendar size={14} /> <span style={{ whiteSpace: 'nowrap' }}>{inst.deliveryDate}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, color: '#94a3b8' }}>
                                                <DollarSign size={16} />
                                            </div>
                                        </div>
                                    ) : (settings as any).installationsLayoutMode === 'grid-compact' ? (
                                        /* Layout a Griglia Compatta */
                                        <div
                                            key={generateSemanticId(inst)}
                                            onClick={() => handleOpenDetail(inst)}
                                            className="glass-panel"
                                            style={{
                                                padding: '0.75rem',
                                                borderLeft: `5px solid ${getCardColor(inst)}`,
                                                cursor: 'pointer',
                                                opacity: 0.8,
                                                backgroundColor: '#f8fafc',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#94a3b8' }}>
                                                <DollarSign size={14} />
                                            </div>
                                            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', lineHeight: '1.2', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingRight: '1rem' }}>
                                                {inst.client}
                                            </h3>
                                            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8' }}>
                                                    <Box size={12} style={{ flexShrink: 0 }} /> <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.machine}</strong>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8' }}>
                                                    <Calendar size={12} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.deliveryDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Layout a Griglia Standard */
                                        <div
                                            key={generateSemanticId(inst)}
                                            onClick={() => handleOpenDetail(inst)}
                                            className="glass-panel"
                                            style={{
                                                padding: '1.25rem',
                                                borderLeft: `6px solid ${getCardColor(inst)}`,
                                                cursor: 'pointer',
                                                opacity: 0.8,
                                                backgroundColor: '#f8fafc'
                                            }}
                                        >
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#94a3b8' }}>
                                                <DollarSign size={20} />
                                            </div>
                                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#64748b' }}>
                                                {inst.client}
                                                {inst.installationSite && (
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'normal', opacity: 0.8 }}>
                                                        {' - '}{inst.installationSite}
                                                    </span>
                                                )}
                                            </h3>
                                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#94a3b8' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Box size={14} /> <strong>{inst.machine}</strong>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Calendar size={14} /> {inst.deliveryDate}
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                                <span>Ordine {inst.orderNumber}</span>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Professionale v1.9.6 */}
            {selectedInst && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div className="glass-panel modal-fullscreen-mobile" style={{ width: '100%', maxWidth: '900px', maxHeight: '95vh', overflowY: 'auto', padding: 0, position: 'relative', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

                        {/* Header Modal */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ backgroundColor: getCardColor(selectedInst), padding: '0.75rem', borderRadius: '12px', color: '#fff' }}>
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Dettaglio Installazione</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>ID RIGA: {selectedInst.rowId} • ORDINE #{selectedInst.orderNumber}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInst(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {/* Sezione Cliente */}
                            <div style={{ marginBottom: '2rem', position: 'relative' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Cliente / Ragione Sociale</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <User size={20} style={{ color: 'var(--primary-color)' }} />
                                    <input
                                        type="text"
                                        value={editData.localOverrides?.client ?? selectedInst.client}
                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, client: e.target.value } }))}
                                        style={{ fontSize: '1.5rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: '2px solid transparent', width: '100%', padding: '0.2rem 0', transition: 'border-color 0.2s' }}
                                        onFocus={e => e.target.style.borderBottomColor = 'var(--primary-color)'}
                                        onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                                    />
                                </div>
                            </div>

                            {/* Info Macchina e Pianificazione Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '1.25rem', background: '#f8fafc' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Box size={14} /> DATI MACCHINA
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input
                                            placeholder="Nome Macchina"
                                            className="form-control"
                                            value={editData.localOverrides?.machine ?? selectedInst.machine}
                                            onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, machine: e.target.value } }))}
                                            style={{ border: '1px solid #cbd5e1', padding: '0.6rem' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {fieldConfig.showModelSK !== false && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Modello SK</label>
                                                    <input
                                                        placeholder="Modello SK"
                                                        className="form-control"
                                                        value={editData.localOverrides?.modelSK ?? selectedInst.modelSK}
                                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, modelSK: e.target.value } }))}
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showSerialSK !== false && (
                                                <div style={{ flex: '1 1 120px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Matricola</label>
                                                    <input
                                                        placeholder="Matricola"
                                                        className="form-control"
                                                        value={editData.localOverrides?.serialSK ?? selectedInst.serialSK}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, serialSK: val } }));
                                                        }}
                                                        onFocus={() => {
                                                            // if empty and we have a prefix, populate and select
                                                            const currentVal = editData.localOverrides?.serialSK ?? selectedInst.serialSK;
                                                            if (!currentVal && settings.serialPrefix) {
                                                                setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, serialSK: settings.serialPrefix } }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showOrderNumber !== false && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>N. Ordine Principale</label>
                                                    <input
                                                        placeholder="N. Ordine"
                                                        className="form-control"
                                                        value={editData.localOverrides?.orderNumber ?? selectedInst.orderNumber ?? ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, orderNumber: e.target.value } }))}
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showOrderDfv !== false && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>N. ordine DFV</label>
                                                    <input
                                                        placeholder="N. ordine DFV"
                                                        className="form-control"
                                                        value={editData.localOverrides?.orderDfv ?? selectedInst.orderDfv ?? ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, orderDfv: e.target.value } }))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {fieldConfig.showPlanning !== false && (
                                    <div className="glass-panel" style={{ padding: '1.25rem', background: '#f8fafc' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Calendar size={14} /> PIANIFICAZIONE
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{ flex: '1 1 120px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Data Installazione</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        value={editData.scheduledDate || selectedInst.deliveryDate}
                                                        onChange={e => setEditData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                                    />
                                                </div>
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Ora Locale</label>
                                                    <input
                                                        type="time"
                                                        className="form-control"
                                                        value={editData.scheduledTime || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                                    />
                                                </div>
                                                <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                                    {editData.scheduledDate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditData(prev => ({ ...prev, scheduledDate: '', scheduledTime: '' }))}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--danger-color)',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.3rem',
                                                                padding: '0.3rem 0.5rem',
                                                                borderRadius: '4px',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                        >
                                                            <X size={14} /> Rimuovi Data
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Sito / Destinazione</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <MapPin size={18} style={{ color: 'var(--danger-color)' }} />
                                                    <input
                                                        placeholder="Sito di installazione"
                                                        className="form-control"
                                                        value={editData.localOverrides?.installationSite ?? selectedInst.installationSite}
                                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, installationSite: e.target.value } }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Google Calendar Sync Button */}
                                            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                                <button
                                                    onClick={handleAddEventToCalendar}
                                                    disabled={isSyncingCalendar || !editData.scheduledDate}
                                                    className="btn"
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.65rem',
                                                        backgroundColor: googleToken ? (editData.scheduledDate ? '#f0fdfa' : '#f1f5f9') : '#f8fafc',
                                                        color: googleToken ? (editData.scheduledDate ? '#0f766e' : '#94a3b8') : '#64748b',
                                                        border: `1px solid ${googleToken ? (editData.scheduledDate ? '#14b8a6' : '#cbd5e1') : '#e2e8f0'}`,
                                                        transition: 'all 0.2s',
                                                        cursor: (isSyncingCalendar || (!editData.scheduledDate && googleToken)) ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {isSyncingCalendar ? (
                                                        <><RefreshCw className="spin" size={18} /> Sincronizzazione in corso...</>
                                                    ) : googleToken ? (
                                                        <><Calendar size={18} /> {editData.scheduledDate ? 'Aggiungi a Google Calendar' : 'Inserisci una data per sincronizzare'}</>
                                                    ) : (
                                                        <><LinkIcon size={18} /> Collega Google per sincronizzare</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Componenti Estratti (Al posto di Applicazioni) */}
                            {fieldConfig.showExtractedNotes !== false && (
                                <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#fdf4ff', borderRadius: '16px', border: '1px solid #fbcfe8' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9d174d', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Truck size={20} /> COMPONENTI ESTRATTI (CODICI DALLE NOTE)
                                    </label>
                                    <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #fce7f3', minHeight: '120px' }}>
                                        {selectedInst.extractedNotes ? (
                                            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#831843', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                                {selectedInst.extractedNotes.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.4rem' }}>{line}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#f472b6', fontStyle: 'italic', fontSize: '0.95rem', marginTop: '1.5rem' }}>
                                                Nessun componente aggiuntivo registrato nelle note del Foglio Google.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Nuova Selezione Moduli / Opzioni */}
                            {fieldConfig.showModules !== false && (
                                <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <ListChecks size={20} /> SELEZIONE MODULI DA ATTIVARE
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.6rem' }}>
                                        {(settings.installationModules || []).map((feature: string, idx: number) => {
                                            const selectedList = editData.localOverrides?.selectedFeatures || [];
                                            const isSelected = selectedList.includes(feature);
                                            const hasAnySelected = selectedList.length > 0;
                                            const isFaint = hasAnySelected && !isSelected;

                                            return (
                                                <label key={idx} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    cursor: 'pointer',
                                                    opacity: isFaint ? 0.35 : 1,
                                                    fontWeight: isSelected ? 700 : 500,
                                                    color: isSelected ? '#15803d' : '#166534',
                                                    transition: 'opacity 0.2s, color 0.2s',
                                                    fontSize: '0.85rem',
                                                    padding: '0.4rem',
                                                    borderRadius: '6px',
                                                    backgroundColor: isSelected ? '#dcfce7' : 'transparent'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const current = editData.localOverrides?.selectedFeatures || [];
                                                            let next;
                                                            if (e.target.checked) {
                                                                next = [...current, feature];
                                                            } else {
                                                                next = current.filter((f: string) => f !== feature);
                                                            }
                                                            setEditData(prev => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...(prev.localOverrides || {}),
                                                                    selectedFeatures: next
                                                                }
                                                            }));
                                                        }}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                                                    />
                                                    <span style={{ lineHeight: '1.4' }}>{feature}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Spazio Note Molto Ampio */}
                            {fieldConfig.showTechnicalNotes !== false && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MessageSquare size={18} /> NOTE E OSSERVAZIONI TECNICHE
                                    </label>
                                    <textarea
                                        className="form-control"
                                        placeholder="Inserisci qui i commenti originali o le nuove note dell'amministrazione..."
                                        value={editData.comments || ''}
                                        onChange={e => setEditData(prev => ({ ...prev, comments: e.target.value }))}
                                        style={{
                                            minHeight: '120px',
                                            width: '100%',
                                            padding: '1.5rem',
                                            fontSize: '1rem',
                                            lineHeight: '1.6',
                                            borderRadius: '16px',
                                            border: '1px solid #cbd5e1',
                                            backgroundColor: '#fff',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Stati (Fatturato, Da collaudare, Collaudata) - SPOSTATI IN BASSO */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: editData.toTest ? 1 : 0.5 }}>
                                            <input type="checkbox" checked={editData.toTest || false} onChange={e => setEditData(prev => ({ ...prev, toTest: e.target.checked, tested: e.target.checked ? prev.tested : false }))} style={{ width: '28px', height: '28px' }} />
                                            <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}>🟡 DA COLLAUDARE</span>
                                        </label>
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: editData.tested ? 1 : 0.5 }}>
                                            <input type="checkbox" checked={editData.tested || false} onChange={e => setEditData(prev => ({ ...prev, tested: e.target.checked, toTest: e.target.checked ? true : prev.toTest }))} style={{ width: '28px', height: '28px' }} />
                                            <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.85rem' }}>🟢 COLLAUDATA</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Azioni */}
                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '1rem' }}>
                            <button onClick={handleDelete} className="btn" style={{ backgroundColor: 'transparent', borderColor: '#ef4444', color: '#ef4444', padding: '0.5rem 1rem' }}>
                                <Trash2 size={18} /> {deleteConfirm ? 'Conferma eliminazione?' : 'Elimina scheda'}
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {selectedInst.isManual && googleToken && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#0f766e', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                                        <input
                                            type="checkbox"
                                            checked={exportToSheet}
                                            onChange={e => setExportToSheet(e.target.checked)}
                                            style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                                        />
                                        Esporta su Google Sheets
                                    </label>
                                )}
                                <button onClick={() => setSelectedInst(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Annulla</button>
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {saving ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE CAMERA DI SICUREZZA ORPHAN VAULT */}
            {showOrphanVault && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={24} /> Dati Scollegati (Camera di Sicurezza)
                            </h3>
                            <button onClick={() => { setShowOrphanVault(false); setOrphanToRelink(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ backgroundColor: '#fff8f1', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #f97316', fontSize: '0.9rem', color: '#9a3412' }}>
                            Qui trovi i dati inseriti dall'App (appunti, collaudi, pianificazioni) che <strong>non corrispondono più a nessuna riga sul foglio Google</strong> a causa di rinomine, cancellazioni o errori nel foglio. Puoi ricollegarli a un'installazione esistente per non perdere il lavoro fatto!
                        </div>

                        {orphanedData.map(orphan => (
                            <div key={orphan._firestoreId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>{orphan.client || 'Cliente Sconosciuto'}</h4>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '1rem', rowGap: '0.2rem' }}>
                                            <strong>Macchina/SN:</strong> <span>{orphan.machine || '-'} / {orphan.serialSK || '-'}</span>
                                            <strong>Dati App:</strong> <span>
                                                {orphan.comments ? '📝 Note presenti  ' : ''}
                                                {orphan.tested ? '🟢 Collaudata  ' : ''}
                                                {orphan.toTest ? '🟡 Da Collaudare  ' : ''}
                                                {orphan.scheduledDate ? '📅 Pianificata' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {orphanToRelink?._firestoreId !== orphan._firestoreId ? (
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                                            onClick={() => { setOrphanToRelink(orphan); setRelinkTargetId(''); }}
                                        >
                                            <LinkIcon size={14} /> Ricollega Dati
                                        </button>
                                    ) : null}
                                </div>

                                {/* Area di Ricollegamento */}
                                {orphanToRelink?._firestoreId === orphan._firestoreId && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#1d4ed8' }}>
                                            Scegli l'installazione corrente a cui unire questi dati:
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <select 
                                                className="form-control" 
                                                style={{ flex: 1, minWidth: '250px' }}
                                                value={relinkTargetId}
                                                onChange={e => setRelinkTargetId(e.target.value)}
                                            >
                                                <option value="">-- Seleziona Riga Target --</option>
                                                {installations.map(i => (
                                                    <option key={i._firestoreId} value={i._firestoreId}>
                                                        {i.client} - {i.machine} (Ord: {i.orderNumber})
                                                    </option>
                                                ))}
                                            </select>
                                            <button 
                                                className="btn btn-primary" 
                                                disabled={!relinkTargetId}
                                                onClick={() => handleRelink(orphan._firestoreId!, relinkTargetId)}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                Conferma Fusione
                                            </button>
                                            <button 
                                                className="btn btn-secondary"
                                                onClick={() => setOrphanToRelink(null)}
                                            >
                                                Annulla
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
