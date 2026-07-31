import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, addDoc, writeBatch, limit } from 'firebase/firestore';
import { Search, ArrowUpDown, X, Save, Plus, MoreVertical } from 'lucide-react';

export interface Ordine {
    id: string;
    rowIndex?: number;
    ordine?: string; A?: string;
    cliente?: string; B?: string;
    macchine?: string; C?: string;
    installazione?: string; D?: string;
    data_cons?: string; E?: string;
    dataEffettivaConsegna?: string; L?: string;
    modello_sk?: string; F?: string;
    matricola_sk?: string; G?: string;
    data_inst?: string; H?: string;
    commenti?: string; I?: string;
    note_inst?: string; J?: string;
    note_amm?: string; K?: string;
    fatturato?: boolean;
    collaudato?: boolean;
    style?: string;
    isBold?: boolean;
    isNew?: boolean;
    [key: string]: string | boolean | number | undefined | null;
}

export interface InstallationData {
    tested?: boolean;
    toTest?: boolean;
    updatedAt?: number;
    [key: string]: string | boolean | number | undefined | null;
}

// --- STILI INLINE ESTRATTI DAL COMPONENTE PER OTTIMIZZARE I RE-RENDER ---
const tableStyle = {
    container: { padding: '10px 15px', fontFamily: 'Segoe UI, Tahoma, sans-serif', background: '#f4f7f6', minHeight: '100vh' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    searchBar: { display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '25px', border: '1px solid #ccc', width: '250px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    badge: { padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' as const, background: '#2c3e50', color: 'white' },
    tableWrapper: { overflow: 'auto' as const, background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #ddd', maxHeight: '88vh' },
    table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const },
    th: { background: '#2c3e50', color: 'white', padding: '10px 12px', cursor: 'pointer', border: '1px solid #ddd', fontSize: '0.8rem', whiteSpace: 'nowrap' as const, position: 'sticky' as const, top: 0, zIndex: 10, textAlign: 'left' as const },
    td: { padding: '8px 12px', border: '1px solid #ddd', fontSize: '0.8rem', color: '#333', textAlign: 'left' as const, cursor: 'pointer' },
    truncatedTd: { padding: '8px 12px', border: '1px solid #ddd', fontSize: '0.8rem', color: '#333', textAlign: 'left' as const, cursor: 'pointer', maxWidth: '200px', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    modalOverlay: { position: 'fixed' as const, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', padding: '25px', borderRadius: '8px', width: '95%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' as const, fontSize: '0.8rem', color: '#2c3e50' },
    input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', boxSizing: 'border-box' as const },
    dropdownMenu: { position: 'absolute' as const, right: '100%', top: '50%', transform: 'translateY(-50%)', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid #eee', padding: '5px 0', zIndex: 50, minWidth: '150px', display: 'flex', flexDirection: 'column' as const },
    dropdownItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 15px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f9f9f9', background: 'transparent', border: 'none', width: '100%', textAlign: 'left' as const }
};

export const SharedSheet: React.FC = () => {
    const { sheetId } = useParams<{ sheetId: string }>();
    const currentId = sheetId ?? (window.location.pathname.includes('/ordini') ? 'ordini' : 'ordini');

    const [rowData, setRowData] = useState<Ordine[]>([]);
    const [installationData, setInstallationData] = useState<Record<string, InstallationData>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [editingRow, setEditingRow] = useState<Ordine | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const VERSION = import.meta.env.VITE_APP_VERSION ? `${import.meta.env.VITE_APP_VERSION} - SYSTEM LOGIC LOCKDOWN` : "23.8.0 - SYSTEM LOGIC LOCKDOWN";

    // --- CLICK FUORI PER CHIUDERE DROPDOWN ---
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // --- FETCH DATI ---
    useEffect(() => {
        // Ottimizzazione: limita ai soli 200 record più recenti e non archiviati/fatturati per non saturare la memoria
        const q = query(collection(db, currentId), orderBy('rowIndex', 'desc'), limit(200));
        const unsubscribeSheet = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<Ordine, 'id'>)
            }));
            setRowData(data as Ordine[]);
            setLoading(false);
        }, (err) => {
            console.error("FIRESTORE ERROR:", err);
            setLoading(false);
        });

        // OPZIONE A (Filtro speculare): Ho scelto questa opzione perché installation_data determina 
        // immediatamente i colori delle righe (computeRowColor) al primo render. 
        // Un approccio Lazy Fetch (Opzione B) causerebbe flickering visivo (righe che cambiano colore in ritardo) 
        // e genererebbe centinaia di chiamate getDoc() simultanee intasando il network.
        const qInst = query(collection(db, 'installation_data'), limit(200));
        const unsubscribeInst = onSnapshot(qInst, (snapshot) => {
            const instMap: Record<string, InstallationData> = {};
            snapshot.forEach(doc => {
                instMap[doc.id] = doc.data() as InstallationData;
            });
            setInstallationData(instMap);
        });

        return () => {
            unsubscribeSheet();
            unsubscribeInst();
        };
    }, [currentId]);

    // --- LOGICA ORDINAMENTO ---
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        let sortableItems = [...rowData];

        if (search) {
            sortableItems = sortableItems.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(search.toLowerCase())
                )
            );
        }

        // FT always at the bottom, even without sort config
        // VER 23.0.0: Now based on 'Fatturazione' field (old data_cons/E) not being empty
        const isFatturatoRow = (item: Ordine) => {
            if (item.fatturato === true) return true;
            const fatturazione = String(item.data_cons || item.E || "").trim().toUpperCase();
            return fatturazione.includes("FT");
        };

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const getVal = (item: Ordine) => {
                    switch (sortConfig.key) {
                        case 'ordine': return item.ordine || item.A || "";
                        case 'cliente': return item.cliente || item.B || "";
                        case 'macchine': return item.macchine || item.C || "";
                        case 'installazione': return item.installazione || item.D || "";
                        case 'data_cons': return item.data_cons || item.E || "";
                        case 'dataEffettivaConsegna': return item.dataEffettivaConsegna || item.L || "";
                        case 'modello_sk': return item.modello_sk || item.F || "";
                        case 'matricola_sk': return item.matricola_sk || item.G || "";
                        case 'data_inst': return item.data_inst || item.H || "";
                        case 'commenti': return item.commenti || item.I || "";
                        case 'note_inst': return item.note_inst || item.J || "";
                        case 'note_amm': return item.note_amm || item.K || "";
                        default: return item[sortConfig.key] || "";
                    }
                };

                const valA = getVal(a);
                const valB = getVal(b);

                if (sortConfig.key === 'data_cons' || sortConfig.key === 'dataEffettivaConsegna') {
                    const strA = String(valA).trim().toUpperCase();
                    const strB = String(valB).trim().toUpperCase();

                    const specialA = isFatturatoRow(a) || (sortConfig.key === 'data_cons' && /[A-Z]/.test(strA)) || strA === '';
                    const specialB = isFatturatoRow(b) || (sortConfig.key === 'data_cons' && /[A-Z]/.test(strB)) || strB === '';

                    if (specialA && !specialB) return 1;
                    if (!specialA && specialB) return -1;

                    if (specialA && specialB) {
                        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    }

                    const parseCustomDate = (val: string) => {
                        if (val.includes('/')) {
                            const p = val.split('/');
                            if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
                        }
                        const t = new Date(val).getTime();
                        return isNaN(t) ? 0 : t;
                    };

                    const dateA = parseCustomDate(strA);
                    const dateB = parseCustomDate(strB);

                    if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Apply FT rule globally: regardless of other sorts, FT (now Fatturazione NOT empty) goes to the bottom
        sortableItems.sort((a, b) => {
            const ftA = isFatturatoRow(a);
            const ftB = isFatturatoRow(b);
            if (ftA && !ftB) return 1;
            if (!ftA && ftB) return -1;
            return 0;
        });

        return sortableItems;
    }, [rowData, sortConfig, search]);

    // --- AZIONI ---
    const handleAdd = () => {
        setEditingRow({ id: '', isNew: true, ordine: '', cliente: '', macchine: '', installazione: '', data_cons: '', dataEffettivaConsegna: '', modello_sk: '', matricola_sk: '', data_inst: '', commenti: '', note_inst: '', note_amm: '' });
    };

    const handleEdit = (row: Ordine) => {
        setEditingRow(row);
    };

    const saveEdit = async () => {
        if (!editingRow) return;

        const payload = {
            ordine: editingRow.ordine || editingRow.A || '',
            cliente: editingRow.cliente || editingRow.B || '',
            macchine: editingRow.macchine || editingRow.C || '',
            installazione: editingRow.installazione || editingRow.D || '',
            data_cons: editingRow.data_cons || editingRow.E || '',
            dataEffettivaConsegna: editingRow.dataEffettivaConsegna || editingRow.L || '',
            modello_sk: editingRow.modello_sk || editingRow.F || '',
            matricola_sk: editingRow.matricola_sk || editingRow.G || '',
            data_inst: editingRow.data_inst || editingRow.H || '',
            commenti: editingRow.commenti || editingRow.I || '',
            note_inst: editingRow.note_inst || editingRow.J || '',
            note_amm: editingRow.note_amm || editingRow.K || '',
            A: editingRow.ordine || editingRow.A || '',
            B: editingRow.cliente || editingRow.B || '',
            C: editingRow.macchine || editingRow.C || '',
            D: editingRow.installazione || editingRow.D || '',
            E: editingRow.data_cons || editingRow.E || '',
            F: editingRow.modello_sk || editingRow.F || '',
            G: editingRow.matricola_sk || editingRow.G || '',
            H: editingRow.data_inst || editingRow.H || '',
            I: editingRow.commenti || editingRow.I || '',
            J: editingRow.note_inst || editingRow.J || '',
            K: editingRow.note_amm || editingRow.K || '',
            L: editingRow.dataEffettivaConsegna || editingRow.L || '',
        };

        try {
            if (editingRow.isNew) {
                await addDoc(collection(db, currentId), { ...payload, rowIndex: Date.now() });
            } else {
                await updateDoc(doc(db, currentId, editingRow.id), payload);
            }
            setEditingRow(null);
        } catch (error) {
            console.error("Errore salvataggio:", error);
            alert("Errore durante il salvataggio");
        }
    };

    const handleStyleChange = async (id: string, color: string, currentBold: boolean) => {
        // Guardia: non sovrascrivere stati automatici con stile manuale
        const row = rowData.find(r => r.id === id);
        if (row) {
            const realData = installationData[id];
            if (row.fatturato === true || realData?.tested === true) {
                alert('⚠️ Impossibile cambiare colore manualmente: lo stato (Fatturato / Collaudato) ha la priorità assoluta.');
                return;
            }
        }
        try {
            await updateDoc(doc(db, currentId, id), { style: color, isBold: currentBold });
        } catch (error) {
            console.error("Errore salvataggio stile:", error);
        }
    };

    // Segna come FATTURATO (P1) — sposta in fondo
    const handleSetFatturato = async (id: string, value: boolean) => {
        try {
            await updateDoc(doc(db, currentId, id), { fatturato: value });
        } catch (error) {
            console.error("Errore fatturato:", error);
        }
    };

    // Segna come COLLAUDATO (P2) — scrive anche su installation_data per coerenza
    const handleSetCollaudato = async (id: string, value: boolean) => {
        try {
            const batch = writeBatch(db);
            const ordiniRef = doc(db, currentId, id);
            const instRef = doc(db, 'installation_data', id);
            
            batch.update(ordiniRef, { collaudato: value });
            batch.set(instRef, { tested: value, updatedAt: Date.now() }, { merge: true });
            
            await batch.commit();
        } catch (error) {
            console.error("Errore collaudato:", error);
        }
    };

    // Reset colore manuale
    const handleResetStyle = async (id: string) => {
        try {
            const batch = writeBatch(db);
            const ordiniRef = doc(db, currentId, id);
            const instRef = doc(db, 'installation_data', id);
            
            batch.update(ordiniRef, { style: '', fatturato: false, collaudato: false });
            batch.set(instRef, { tested: false, toTest: false }, { merge: true });
            
            await batch.commit();
        } catch (error) {
            console.error("Errore reset:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Sei sicuro di voler eliminare questa riga? Questa azione è irreversibile.")) {
            setRowData(prev => prev.filter(r => r.id !== id));
            try {
                await deleteDoc(doc(db, currentId, id));
            } catch (error) {
                console.error("Errore eliminazione:", error);
                alert("Errore durante l'eliminazione");
            }
        }
    };


    // --- STILI INLINE RIMOSSI E SPOSTATI FUORI DAL COMPONENTE PER OTTIMIZZAZIONE ---
    /**
     * computeRowColor — MATRICE COLORI VER 22.1.0
     * Gerarchia priorità (dall'alto = massima priorità):
     *  P1. FATTURATO  → grigio   (#f2f2f2)  — vince su tutto
     *  P2. COLLAUDATO → verde    (#c6efce)  — tested === true
     *  P3. DA COLLAUDARE → giallo (#ffff99) — toTest === true
     *  P4. MANUALE    → colore custom da admin (row.style)
     *  P5. DEFAULT    → transparent
     */
    const computeRowColor = (row: Ordine): { bg: string; label: string | null; labelColor: string } => {
        const vFatturazione = String(row.data_cons || row.E || "").trim().toUpperCase();
        // Colonna 10 (Commenti) viene scritta dal pannello Dettaglio (DA COLLAUDARE / COLLAUDATA)
        const vCommenti = String(row.commenti || row.I || "").trim().toUpperCase();
        
        // Pannello Dettaglio (installation_data)
        const realData = installationData[row.id] || {};

        // 1. DEFINIZIONE COLORI DEFINITIVI
        const COLOR_VERDE = "#c8e6c9";   // Verde pieno professionale
        const COLOR_GIALLO = "#ffd54f";  // Giallo Ocria intenso
        const COLOR_GRIGIO = "#e8e8e8";  // Grigio standard

        // 2. DETERMINAZIONE STATO E COLORE (GERARCHIA)
        let bg = "white";
        let label: string | null = null;
        let labelColor = "#333";

        // P1 — FATTURATO (FT Vince su tutto - PRIORITÀ MASSIMA)
        const hasFT = vFatturazione.includes("FT") || row.fatturato === true;
        if (hasFT) {
            bg = COLOR_GRIGIO;
            label = "FATTURATO";
            labelColor = "#666";
            return { bg, label, labelColor };
        }

        // P2 — COLLAUDATO (Flag 'Collaudata' ATTIVO nel Dettaglio)
        // Verifichiamo sia il flag nel DB che il testo scritto dal sync in Colonna 10
        const isTested = realData.tested === true || vCommenti === "COLLAUDATA";
        if (isTested) {
            bg = COLOR_VERDE;
            label = "COLLAUDATO";
            labelColor = "#1b5e20";
            return { bg, label, labelColor };
        }

        // P3 — IN ATTESA (Flag 'Da Collaudare' ATTIVO nel Dettaglio)
        const isPending = realData.toTest === true || vCommenti === "DA COLLAUDARE";
        if (isPending) {
            bg = COLOR_GIALLO;
            label = "IN ATTESA";
            labelColor = "#bf360c";
            return { bg, label, labelColor };
        }

        // P4 — COLORE MANUALE ADMIN (Solo se nessuno stato sopra è attivo)
        if (row.style && typeof row.style === 'string' && row.style !== 'transparent' && row.style !== '') {
            bg = row.style;
        }

        return { bg, label: label || "", labelColor };
    };

    return (
        <div style={tableStyle.container}>
            <div style={tableStyle.topBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={tableStyle.searchBar}>
                        <Search size={14} color="#95a5a6" />
                        <input
                            type="text"
                            placeholder="Cerca..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.8rem' }}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        style={{ padding: '6px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    >
                        <Plus size={14} /> Aggiungi Ordine
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#999', fontWeight: 'bold' }}>{VERSION}</span>
                    <span style={tableStyle.badge}>
                        {loading ? 'SYNC...' : `${rowData.length} ORDINI`}
                    </span>
                </div>
            </div>

            <div style={tableStyle.tableWrapper}>
                <table style={tableStyle.table}>
                    <thead>
                        <tr>
                            <th style={tableStyle.th} onClick={() => requestSort('ordine')}>1. Ordine <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('cliente')}>2. Cliente <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('macchine')}>3. Macchine <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('installazione')}>4. Installazione <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('data_cons')}>5. Fatturazione <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('dataEffettivaConsegna')}>6. Data Consegna <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('modello_sk')}>7. Modello SK <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('matricola_sk')}>8. Matricola SK <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('data_inst')}>9. Data Inst. <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('commenti')}>10. Commenti <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('note_inst')}>11. Note Installazioni <ArrowUpDown size={12} /></th>
                            <th style={tableStyle.th} onClick={() => requestSort('note_amm')}>12. Note Amministrazione <ArrowUpDown size={12} /></th>
                            <th style={{ ...tableStyle.th, textAlign: 'center', width: '110px' }}>Stato</th>
                            <th style={{ ...tableStyle.th, textAlign: 'center', width: '40px' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row) => {
                            const vOrdine = row.ordine || row.A || '-';
                            const vCliente = row.cliente || row.B || '-';
                            const vMacchine = row.macchine || row.C || '-';
                            const vInstallazione = row.installazione || row.D || '-';
                            const vDataCons = row.data_cons || row.E || '-';
                            const vDataEffConsegna = row.dataEffettivaConsegna || row.L || '-';
                            const vModelloSk = row.modello_sk || row.F || '-';
                            const vMatricolaSk = row.matricola_sk || row.G || '-';
                            const vDataInst = row.data_inst || row.H || '-';
                            const vCommenti = row.commenti || row.I || '-';
                            const vNoteInst = row.note_inst || row.J || '-';
                            const vNoteAmm = row.note_amm || row.K || '-';

                            const { bg: computedColor, label: statusLabel, labelColor } = computeRowColor(row);

                            return (
                                <tr key={row.id} style={{ backgroundColor: computedColor, fontWeight: row.isBold ? 'bold' : 'normal' }}>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vOrdine}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vCliente}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vMacchine}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vInstallazione}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vDataCons}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vDataEffConsegna}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vModelloSk}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vMatricolaSk}</td>
                                    <td style={tableStyle.td} onClick={() => handleEdit(row)}>{vDataInst}</td>
                                    <td style={tableStyle.truncatedTd} onClick={() => handleEdit(row)} title={vCommenti}>{vCommenti}</td>
                                    <td style={tableStyle.truncatedTd} onClick={() => handleEdit(row)} title={vNoteInst}>{vNoteInst}</td>
                                    <td style={tableStyle.truncatedTd} onClick={() => handleEdit(row)} title={vNoteAmm}>{vNoteAmm}</td>
                                    {/* COLONNA STATO con badge visivo */}
                                    <td style={{ ...tableStyle.td, textAlign: 'center', width: '110px' }}>
                                        {statusLabel && (
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px',
                                                borderRadius: '4px', background: computedColor === 'transparent' ? '#eee' : computedColor,
                                                color: labelColor, whiteSpace: 'nowrap', letterSpacing: '0.04em',
                                                border: `1px solid ${labelColor}44`
                                            }}>{statusLabel}</span>
                                        )}
                                    </td>
                                    {/* COLONNA AZIONI */}
                                    <td style={{ ...tableStyle.td, textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.id ? null : row.id); }}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7f8c8d' }}
                                        >
                                            <MoreVertical size={18} />
                                        </button>

                                        {openDropdownId === row.id && (
                                            <div style={tableStyle.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                                                {/* P1 — FATTURATO */}
                                                <button
                                                    style={{ ...tableStyle.dropdownItem, color: row.fatturato ? '#e74c3c' : '#555' }}
                                                    onClick={() => { handleSetFatturato(row.id, !row.fatturato); setOpenDropdownId(null); }}
                                                >
                                                    <span>{row.fatturato ? '↩️ Rimuovi Fatturato' : '💶 Segna come Fatturato'}</span>
                                                </button>
                                                {/* P2 — COLLAUDATO */}
                                                <button
                                                    style={{ ...tableStyle.dropdownItem, color: (installationData[row.id]?.tested || row.collaudato) ? '#e74c3c' : '#27ae60' }}
                                                    onClick={() => { handleSetCollaudato(row.id, !(installationData[row.id]?.tested || row.collaudato)); setOpenDropdownId(null); }}
                                                >
                                                    <span>{(installationData[row.id]?.tested || row.collaudato) ? '↩️ Rimuovi Collaudato' : '✅ Segna come Collaudato'}</span>
                                                </button>
                                                <div style={{ height: '1px', background: '#eee', margin: '4px 0' }} />
                                                {/* COLORE MANUALE (solo se non fatturato/collaudato) */}
                                                <div style={tableStyle.dropdownItem}>
                                                    <span style={{ fontWeight: 600 }}>🎨 Colore Sfondo:</span>
                                                    <input
                                                        type="color"
                                                        value={(row.style && row.style.startsWith('#') && row.style.length === 7) ? row.style : '#ffffff'}
                                                        onChange={(e) => handleStyleChange(row.id, e.target.value, !!row.isBold)}
                                                        style={{ width: '25px', height: '25px', padding: 0, border: '1px solid #ddd', cursor: 'pointer', borderRadius: '4px' }}
                                                    />
                                                </div>
                                                <button
                                                    style={tableStyle.dropdownItem}
                                                    onClick={() => { handleStyleChange(row.id, row.style || '', !row.isBold); setOpenDropdownId(null); }}
                                                >
                                                    <span>{row.isBold ? '🔤 Togli Grassetto' : '🅱️ Grassetto'}</span>
                                                </button>
                                                <button
                                                    style={{ ...tableStyle.dropdownItem, color: '#999' }}
                                                    onClick={() => { handleResetStyle(row.id); setOpenDropdownId(null); }}
                                                >
                                                    <span>🔄 Reset Colore</span>
                                                </button>
                                                <div style={{ height: '1px', background: '#eee', margin: '4px 0' }} />
                                                <button
                                                    style={{ ...tableStyle.dropdownItem, color: '#e74c3c', borderBottom: 'none' }}
                                                    onClick={() => { setOpenDropdownId(null); handleDelete(row.id); }}
                                                >
                                                    <span>🗑️ Elimina Riga</span>
                                                </button>
                                            </div>
                                        )}

                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODALE DI MODIFICA/INSERIMENTO */}
            {editingRow && (
                <div style={tableStyle.modalOverlay}>
                    <div style={tableStyle.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.2rem' }}>{editingRow.isNew ? 'Nuovo Ordine' : 'Modifica Riga'}</h2>
                            <button onClick={() => setEditingRow(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7f8c8d' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>1. Ordine</label><input style={tableStyle.input} value={editingRow.ordine || editingRow.A || ''} onChange={e => setEditingRow({ ...editingRow, ordine: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>2. Cliente</label><input style={tableStyle.input} value={editingRow.cliente || editingRow.B || ''} onChange={e => setEditingRow({ ...editingRow, cliente: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>3. Macchine</label><input style={tableStyle.input} value={editingRow.macchine || editingRow.C || ''} onChange={e => setEditingRow({ ...editingRow, macchine: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>4. Installazione</label><input style={tableStyle.input} value={editingRow.installazione || editingRow.D || ''} onChange={e => setEditingRow({ ...editingRow, installazione: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>5. Fatturazione</label><input style={tableStyle.input} value={editingRow.data_cons || editingRow.E || ''} onChange={e => setEditingRow({ ...editingRow, data_cons: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>6. Data Consegna</label><input style={tableStyle.input} value={editingRow.dataEffettivaConsegna || editingRow.L || ''} onChange={e => setEditingRow({ ...editingRow, dataEffettivaConsegna: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>7. Modello SK</label><input style={tableStyle.input} value={editingRow.modello_sk || editingRow.F || ''} onChange={e => setEditingRow({ ...editingRow, modello_sk: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>8. Matricola SK</label><input style={tableStyle.input} value={editingRow.matricola_sk || editingRow.G || ''} onChange={e => setEditingRow({ ...editingRow, matricola_sk: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>9. Data Inst.</label><input style={tableStyle.input} value={editingRow.data_inst || editingRow.H || ''} onChange={e => setEditingRow({ ...editingRow, data_inst: e.target.value })} /></div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>10. Commenti</label><textarea style={{ ...tableStyle.input, minHeight: '80px', resize: 'vertical' }} value={editingRow.commenti || editingRow.I || ''} onChange={e => setEditingRow({ ...editingRow, commenti: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>11. Note Installazioni</label><textarea style={{ ...tableStyle.input, minHeight: '80px', resize: 'vertical' }} value={editingRow.note_inst || editingRow.J || ''} onChange={e => setEditingRow({ ...editingRow, note_inst: e.target.value })} /></div>
                            <div style={tableStyle.formGroup}><label style={tableStyle.label}>12. Note Amministrazione</label><textarea style={{ ...tableStyle.input, minHeight: '80px', resize: 'vertical' }} value={editingRow.note_amm || editingRow.K || ''} onChange={e => setEditingRow({ ...editingRow, note_amm: e.target.value })} /></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                            <button onClick={() => setEditingRow(null)} style={{ padding: '10px 20px', background: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Annulla</button>
                            <button onClick={saveEdit} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}><Save size={18} /> Salva</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedSheet;
