import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Check, Paintbrush, Type, Bold, AlertCircle, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// jspreadsheet-ce v4  (tipizzazione parziale → ts-ignore)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

/* ─── Types ─── */
interface SheetDoc {
    data: Record<string, string>;
    style: Record<string, string>;
    comments: Record<string, string>;
    structureVersion?: number;
}

/* ─── Focus snapshot ─── */
interface FocusSnapshot {
    x1: number; y1: number;
    x2: number; y2: number;
}

/* ─── Save state ─── */
type SaveState = 'saved' | 'saving' | 'error' | 'offline';

/* ═══════════════════════════════════════════════════════
   COSTANTI — MAPPING COLONNE
   ═══════════════════════════════════════════════════════
   CSV col 0  → A  : Ordine
   CSV col 1  → B  : Cliente
   CSV col 2  → C  : Macchina
   CSV col 3  → D  : Installazione
   CSV col 4  → E  : Data (label UI: "Data Cons.")     [CSV: "Data"]
   CSV col 5  → F  : Modello SK
   CSV col 6  → G  : Matricola SK
   CSV col 7  → H  : Data Install. (label UI: "Data Inst.") [CSV: "Data Install."]
   CSV col 8  → I  : Commenti
   CSV col 9  → J  : Note Installazioni
   CSV col 10 → K  : Note Amministrazione
   col  11    → L  : Priorità (nascosta, SOLO in memoria lato client — mai scritta su DB)

   ⚠️  NOTA TIPI: tutte le colonne sono di tipo TEXT (stringhe).
   Le date ("Data Cons.", "Data Inst.") vengono mantenute come stringhe
   nel formato originale del CSV (es. "01/04/2026" o "2025_FT34").
   Non avviene nessuna conversione Date ↔ String per evitare
   inconsistenze tra CSV, Jspreadsheet e Firebase.
   ═══════════════════════════════════════════════════════ */

const ROWS      = 200;
const DATA_COLS = 11;  // colonne dati visibili (0..10, A..K)
const STABLE_ID_COL = 25; // colonna Z: ID stabile per sync e calendario
const COLS      = 26;  // totale colonne fino a Z

const COLUMNS = [
    { title: 'Ordine',               width: 130 },
    { title: 'Cliente',              width: 160 },
    { title: 'Macchina',             width: 180 },
    { title: 'Installazione',        width: 130 },
    { title: 'Data Cons.',           width: 110 },
    { title: 'Modello SK',           width: 190 },
    { title: 'Matricola SK',         width: 190 },
    { title: 'Data Inst.',           width: 110 },
    { title: 'Commenti',             width: 260 },
    { title: 'Note Installazioni',   width: 260 },
    { title: 'Note Amministrazione', width: 260 },
    { title: 'P',                    width:   0 },  // priorità nascosta (col 11)
];

/* ─── Coordinate helpers ─── */
function colLetter(c: number): string {
    let s = '', n = c;
    while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
    return s;
}
function letterCol(s: string): number {
    let i = 0;
    for (let k = 0; k < s.length; k++) i = i * 26 + (s.charCodeAt(k) - 64);
    return i - 1;
}
function cellName(c: number, r: number) { return colLetter(c) + (r + 1); }
function parseName(n: string): [number, number] {
    const m = n.match(/^([A-Z]+)(\d+)$/);
    return m ? [letterCol(m[1]), parseInt(m[2]) - 1] : [0, 0];
}

/* ─── arr2map: converte l'array Jspreadsheet in mappa Firebase ──────────────
   Scrive SOLO le colonne 0–10 (DATA_COLS), mai la col 11 (priorità).
   La priorità è calcolata in memoria e non deve finire su Firebase.
─────────────────────────────────────────────────────────────────────────── */
function arr2map(arr: any[][]): Record<string, string> {
    const m: Record<string, string> = {};
    arr.forEach((row, r) => {
        // Salva colonne dati visibili (A-K)
        for (let c = 0; c < DATA_COLS; c++) {
            const v = row?.[c];
            if (v !== '' && v != null) m[cellName(c, r)] = String(v);
        }
        // Salva colonna Stable ID (Z)
        const stableId = row?.[STABLE_ID_COL];
        if (stableId !== '' && stableId != null) {
            m[cellName(STABLE_ID_COL, r)] = String(stableId);
        }
    });
    return m;
}

/* ─── map2arr: converte la mappa Firebase nell'array Jspreadsheet ──────────
   Popola SOLO le col 0–10. La col 11 (priorità) rimane '' — calcolata dopo.
─────────────────────────────────────────────────────────────────────────── */
function map2arr(m: Record<string, string>, rows: number, cols: number): string[][] {
    const a: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''));
    if (!m) return a;
    for (const [k, v] of Object.entries(m)) {
        const [c, r] = parseName(k);
        // Popola A-K e anche Z
        if (r >= 0 && r < rows && (c < DATA_COLS || c === STABLE_ID_COL)) {
            a[r][c] = v;
        }
    }
    return a;
}

/* ─── sortRows: sort deterministico PURO in JavaScript ────────────────────
   Garantisce che le righe FT finiscano SEMPRE sotto le righe attive,
   indipendentemente dall'ordine originale nel CSV/Firebase.

   Regola di ordinamento:
     Gruppo 0 — Righe ATTIVE  (Ordine non vuoto, Data Cons. senza FT)  → TOP
     Gruppo 1 — Righe FT      (Data Cons. contiene 'FT')               → MEZZO
     Gruppo 2 — Righe VUOTE   (Ordine vuoto E Data Cons. vuota)        → FONDO

   All'interno di ogni gruppo l'ordine originale viene preservato (sort stabile).
   Questo sostituisce completamente l'orderBy(11, 0) di jspreadsheet che è
   lessicografico e non garantisce la separazione corretta tra i gruppi.
─────────────────────────────────────────────────────────────────────────── */
function sortRows(arr: string[][]): string[][] {
    function priority(row: string[]): number {
        const dataCons = String(row[4] || '').toUpperCase();
        const orderCol = String(row[0] || '').trim();
        const isEmpty  = orderCol === '' && dataCons === '';
        const isFT     = dataCons.includes('FT');
        if (isEmpty) return 2;
        if (isFT)    return 1;
        return 0;
    }

    // Separa righe con dati da righe vuote (fondo fisso)
    const dataRows  = arr.filter(row => !(String(row[0] || '').trim() === '' && String(row[4] || '').trim() === ''));
    const emptyRows = arr.filter(row =>   String(row[0] || '').trim() === '' && String(row[4] || '').trim() === '');

    // Sort stabile: attive prima (0), FT dopo (1)
    dataRows.sort((a, b) => priority(a) - priority(b));

    return [...dataRows, ...emptyRows];
}

/* ═════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPALE
═════════════════════════════════════════════════════════════ */
export const SharedSheet: React.FC = () => {
    const { sheetId } = useParams<{ sheetId: string }>();
    const currentId = sheetId ?? (window.location.pathname.includes('/ordini') ? 'ordini' : '');

    /* ── containerRef DEVE essere sempre nel DOM (non rimuovere mai il div!) ── */
    const containerRef = useRef<HTMLDivElement>(null);
    const tableRef     = useRef<any>(null);
    const fsDocRef     = useRef<any>(null);

    const [loading,   setLoading]   = useState(true);
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [authReady, setAuthReady] = useState(false);

    /* ── Timers debounce ── */
    const tSave  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tData  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tStyle = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tComm  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tBlock = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* ── FIX B1 — Echo block: blocca SOLO l'ECHO della propria scrittura ──────
       Funzionamento corretto:
       • Dopo una scrittura locale, impostiamo blocked=true per 2s.
       • L'onSnapshot in quel periodo controlla: se il dato remoto è identico
         al dato locale (diff è 0), skippalo. Se è diverso (altro utente),
         non bloccare.
       • Rispetto alla versione precedente, non blocchiamo più alla cieca:
         usiamo un "fingerprint" dell'ultimo payload scritto per confronto.
    ─────────────────────────────────────────────────────────────────────────── */
    const blocked          = useRef(false);
    const lastWrittenMapRef = useRef<Record<string, string>>({});

    /* ── Flag ignoring: SOLO per aggiornamenti programmatici dall'onSnapshot ── */
    const ignoring = useRef(false);

    /* ── structureVersion locale ── */
    const localStructVersion = useRef<number>(0);

    /* ── Last selection ── */
    const lastSelectionRef = useRef<string[]>([]);

    /* ─── Focus Recovery ──────────────────────────────────────────────────── */
    const captureSelection = useCallback((): FocusSnapshot | null => {
        const t = tableRef.current;
        if (!t) return null;
        try {
            const sel: number[] = t.selectedCell;
            if (sel && sel.length >= 4) {
                return {
                    x1: Math.min(sel[0], sel[2]),
                    y1: Math.min(sel[1], sel[3]),
                    x2: Math.max(sel[0], sel[2]),
                    y2: Math.max(sel[1], sel[3]),
                };
            }
        } catch { /* ignore */ }
        return null;
    }, []);

    const restoreSelection = useCallback((snap: FocusSnapshot | null) => {
        if (!snap || !tableRef.current) return;
        requestAnimationFrame(() => {
            try {
                const t = tableRef.current;
                if (!t) return;
                if (typeof t.updateSelectionFromCoords === 'function') {
                    t.updateSelectionFromCoords(snap.x1, snap.y1, snap.x2, snap.y2);
                } else if (typeof t.setSelection === 'function') {
                    t.setSelection(cellName(snap.x1, snap.y1), cellName(snap.x2, snap.y2));
                }
            } catch (e) {
                console.warn('[sheet] restoreSelection failed:', e);
            }
        });
    }, []);

    /* ─── Data preparation: sort + calcola col 11 ──────────────────────────
       1. Legge la mappa Firebase e la converte in array.
       2. Esegue sortRows() — sort JS puro, stabile, deterministo.
          Le righe FT finiscono SEMPRE sotto le attive, qualunque sia
          l'ordine originale nel CSV/Firebase.
       3. Popola la col 11 (priorità) in base al gruppo assegnato dal sort.
          La col 11 non viene mai salvata su Firebase (arr2map la esclude).
    ─────────────────────────────────────────────────────────────────────── */
    const prepareSortedData = useCallback((map: Record<string, string>) => {
        const raw    = map2arr(map, ROWS, COLS);
        const sorted = sortRows(raw);             // sort JS deterministico

        // Aggiorna col 11 per riflettere la posizione post-sort
        for (let r = 0; r < sorted.length; r++) {
            const row      = sorted[r];
            const dataCons = String(row[4] || '').toUpperCase();
            const orderCol = String(row[0] || '').trim();
            const isFT     = dataCons.includes('FT');
            const isEmpty  = orderCol === '' && dataCons === '';

            if (isEmpty)   row[11] = '2';
            else if (isFT) row[11] = '1';
            else           row[11] = '0';
        }
        return sorted;
    }, []);

    const bgRef  = useRef<HTMLInputElement>(null);
    const txtRef = useRef<HTMLInputElement>(null);

    const { currentUser } = useAuth();
    
    useEffect(() => {
        // 'ordini' bypassa l'auth (Public Access)
        if (currentUser || currentId === 'ordini') {
            setAuthReady(true);
        }
    }, [currentUser, currentId]);

    /* ── FIX B4 — Save con retry e stato errore ─────────────────────────────
       Se la scrittura fallisce:
       1. Primo tentativo: attende 3s e riprova automaticamente.
       2. Se fallisce ancora: mostra indicatore "Errore" + "Offline".
       3. Non mostra mai "Salvato" se il dato non è stato confirmed da Firebase.
    ─────────────────────────────────────────────────────────────────────────── */
    const writeToFirebase = useCallback(async (payload: Record<string, any>, isUpdate = false, retries = 2): Promise<boolean> => {
        if (!fsDocRef.current) return false;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                if (isUpdate) {
                    await updateDoc(fsDocRef.current, payload);
                } else {
                    await setDoc(fsDocRef.current, payload, { merge: true });
                }
                return true;
            } catch (e: any) {
                const isOffline = e?.code === 'unavailable' || e?.message?.includes('offline');
                console.warn(`[sheet] writeToFirebase attempt ${attempt + 1}/${retries}`, e?.code);
                if (attempt < retries - 1) {
                    setSaveState('saving');
                    await new Promise(r => setTimeout(r, 3000)); // attendi 3s prima del retry
                } else {
                    setSaveState(isOffline ? 'offline' : 'error');
                    return false;
                }
            }
        }
        return false;
    }, []);

    /* ── Saving indicator con stato ── */
    const showSaving  = useCallback(() => setSaveState('saving'), []);
    const showSaved   = useCallback(() => {
        if (tSave.current) clearTimeout(tSave.current);
        tSave.current = setTimeout(() => setSaveState('saved'), 1500);
    }, []);

    /* ── blockEcho: blocca l'echo SOLO per 2s ── */
    const blockEcho = useCallback((writtenMap: Record<string, string>) => {
        blocked.current = true;
        lastWrittenMapRef.current = writtenMap;
        if (tBlock.current) clearTimeout(tBlock.current);
        tBlock.current = setTimeout(() => {
            blocked.current = false;
            lastWrittenMapRef.current = {};
        }, 2000);
    }, []);

    /* ── Debounced savers ── */
    /* ── FIX B10 — saveData ATOMICO/CHIRURGICO ──────────────────────────
       Invece di inviare tutta la 'data' map, inviamo solo i cambiamenti.
       Se bumpStructure=true (insert/delete riga), usiamo setDoc con l'intera data.
       Se bumpStructure=false (solo modifiche celle), usiamo updateDoc con dot-notation.
    ─────────────────────────────────────────────────────────────────────────── */
    const pendingChanges = useRef<Record<string, string>>({});

    const saveData = useCallback((bumpStructure = false) => {
        if (tData.current) clearTimeout(tData.current);
        tData.current = setTimeout(async () => {
            if (!tableRef.current || !fsDocRef.current) return;
            showSaving();

            const rawData  = tableRef.current.getData() as string[][];
            const sorted   = sortRows(rawData);
            const fullMap  = arr2map(sorted);

            let payload: any;
            let isUpdateAction = false;

            if (bumpStructure) {
                // Ricaricamento completo richiesto (struttura cambiata)
                localStructVersion.current = localStructVersion.current + 1;
                payload = { 
                    data: fullMap, 
                    structureVersion: localStructVersion.current 
                };
                isUpdateAction = false; // setDoc {merge: true} per l'intero oggetto
            } else {
                // Aggiornamento chirurgico solo celle modificate
                const changes = pendingChanges.current;
                if (Object.keys(changes).length === 0) {
                    showSaved();
                    return;
                }
                
                payload = {};
                for (const [cell, val] of Object.entries(changes)) {
                    payload[`data.${cell}`] = val;
                }
                isUpdateAction = true; // updateDoc per dot-notation
            }

            const ok = await writeToFirebase(payload, isUpdateAction);
            if (ok) {
                if (isUpdateAction) pendingChanges.current = {};
                blockEcho(fullMap);
                showSaved();
            }
        }, 1400);
    }, [showSaving, showSaved, writeToFirebase, blockEcho]);

    const saveStyle = useCallback(() => {
        if (tStyle.current) clearTimeout(tStyle.current);
        tStyle.current = setTimeout(async () => {
            if (!tableRef.current || !fsDocRef.current) return;
            showSaving();
            const style = tableRef.current.getStyle() ?? {};
            const ok = await writeToFirebase({ style });
            if (ok) showSaved();
        }, 700);
    }, [showSaving, showSaved, writeToFirebase]);

    const saveComments = useCallback(() => {
        if (tComm.current) clearTimeout(tComm.current);
        tComm.current = setTimeout(async () => {
            if (!tableRef.current || !fsDocRef.current) return;
            showSaving();
            const comments = tableRef.current.getComments() ?? {};
            const ok = await writeToFirebase({ comments });
            if (ok) showSaved();
        }, 500);
    }, [showSaving, showSaved, writeToFirebase]);

    /* ── Custom Search ── */
    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!tableRef.current) return;
        try { tableRef.current.search(e.target.value); }
        catch (err) { console.error('[sheet] search error:', err); }
    }, []);

    /* ── applyAutoSort: riordina i dati JS e ricarica la tabella ────────────
       Viene chiamato SOLO dopo che l'utente modifica col 0 o col 4 (con delay 4s).
       NON viene chiamato al primo caricamento (i dati arrivano già sortati).

       Legge il dato grezzo dalla tabella, lo ri-sorta con sortRows/prepareSortedData
       e richiama loadData. Protetto da ignoring per evitare loop onchange→saveData.
    ─────────────────────────────────────────────────────────────────────── */
    const applyAutoSort = useCallback((table: any, focusSnap?: FocusSnapshot | null) => {
        if (!table) return;
        try {
            ignoring.current = true;
            // Leggi il dato grezzo corrente (col 0-10 only), poi risortalo
            const rawData = table.getData() as string[][];
            // sortRows è deterministico: attivi → FT → vuoti
            const resorted = sortRows(rawData);
            // Aggiorna col 11 (priorità) post-sort
            for (let r = 0; r < resorted.length; r++) {
                const row      = resorted[r];
                const dataCons = String(row[4] || '').toUpperCase();
                const orderCol = String(row[0] || '').trim();
                const isFT     = dataCons.includes('FT');
                const isEmpty  = orderCol === '' && dataCons === '';
                if (isEmpty)   row[11] = '2';
                else if (isFT) row[11] = '1';
                else           row[11] = '0';
            }
            table.loadData(resorted);
            ignoring.current = false;
            if (focusSnap !== undefined) restoreSelection(focusSnap);
        } catch (e) {
            ignoring.current = false;
            console.error('[sheet] applyAutoSort', e);
        }
    }, [restoreSelection]);

    /* ── Init ──────────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!authReady || !currentId || !containerRef.current) return;

        const ref = doc(db, 'fogli_condivisi', currentId);
        fsDocRef.current = ref;
        let unsubSnap: (() => void) | null = null;
        let dead = false;

        (async () => {
            /* 1 — Carica snapshot iniziale */
            let init: SheetDoc = { data: {}, style: {}, comments: {}, structureVersion: 0 };
            try {
                console.log('[sheet] getDoc start');
                const snap = await getDoc(ref);
                console.log('[sheet] getDoc done, exists:', snap.exists());
                if (snap.exists()) {
                    const d = snap.data() as Partial<SheetDoc>;
                    init = {
                        data:             d.data             ?? {},
                        style:            d.style            ?? {},
                        comments:         d.comments         ?? {},
                        structureVersion: d.structureVersion ?? 0,
                    };
                }
            } catch (err) {
                console.error('[sheet] getDoc error:', err);
                setSaveState('error');
            }
            if (dead) return;

            /* FIX B5: rimuovere il secondo getDoc() che esisteva in precedenza.
               structureVersion è già letta nello snapshot iniziale sopra. */
            localStructVersion.current = init.structureVersion ?? 0;

            /* 2 — Distruggi istanza precedente se esiste */
            const el = containerRef.current!;
            try { if ((el as any).jexcel) (el as any).jexcel.destroy(el, false); } catch { /**/ }
            el.innerHTML = '';

            /* 3 — Inizializza Jspreadsheet */
            const initData = prepareSortedData(init.data);

            const table = (jspreadsheet as any)(el, {
                data: initData,
                columns: COLUMNS.map((col, idx) => ({
                    title: col.title,
                    width: col.width,
                    type:  idx === 11 ? 'hidden' : 'text',
                    align: 'left',
                })),
                minDimensions: [COLS, ROWS],
                tableOverflow:     true,
                tableWidth:        '100%',
                tableHeight:       '100%',
                defaultColAlign:   'left',
                freezeColumns:     2,
                allowComments:     true,
                allowInsertRow:    true,
                allowInsertColumn: false,
                allowDeleteRow:    true,
                allowDeleteColumn: false,
                columnDrag:        false,
                filters:           true,
                search:            true,
                columnSorting:     true,
                style:             init.style,
                comments:          init.comments,

                /* ── updateTable: colora righe per stato ── */
                updateTable: function(instance: any, cell: any, _col: any, row: any) {
                    cell.classList.remove('row-ft', 'row-dacollaudare', 'row-collaudata');
                    const dataCons = String(instance.jexcel.getValueFromCoords(4, row) || '').toUpperCase();
                    const comment  = String(instance.jexcel.getValueFromCoords(8, row) || '').toUpperCase();

                    if      (dataCons.includes('FT'))          cell.classList.add('row-ft');
                    else if (comment.includes('DA COLLAUDARE')) cell.classList.add('row-dacollaudare');
                    else if (comment.includes('COLLAUDATA'))   cell.classList.add('row-collaudata');
                },

                text: {
                    noRecordsFound:                       'Nessun record trovato',
                    showingPage:                          'Pagina {0} di {1}',
                    show:                                 'Mostra ',
                    search:                               'Cerca',
                    entries:                              ' voci',
                    insertANewColumnBefore:               'Inserisci colonna a sinistra',
                    insertANewColumnAfter:                'Inserisci colonna a destra',
                    deleteSelectedColumns:                'Elimina colonne selezionate',
                    renameThisColumn:                     'Rinomina colonna',
                    orderAscending:                       'Ordine crescente',
                    orderDescending:                      'Ordine decrescente',
                    insertANewRowBefore:                  'Inserisci riga sopra',
                    insertANewRowAfter:                   'Inserisci riga sotto',
                    deleteSelectedRows:                   'Elimina righe selezionate',
                    editComments:                         'Modifica commenti',
                    addComments:                          'Aggiungi commento',
                    comments:                             'Commenti',
                    clearComments:                        'Cancella commenti',
                    copy:                                 'Copia...',
                    paste:                                'Incolla...',
                    saveAs:                               'Salva come...',
                    about:                                'Informazioni',
                    areYouSureToDeleteTheSelectedRows:    'Sei sicuro di voler eliminare le righe selezionate?',
                    areYouSureToDeleteTheSelectedColumns: 'Sei sicuro di voler eliminare le colonne selezionate?',
                },

                /* ── onselection ── */
                onselection: (_instance: any, x1: number, y1: number, x2: number, y2: number) => {
                    const cells: string[] = [];
                    for (let r = Math.min(y1, y2); r <= Math.max(y1, y2); r++)
                        for (let c = Math.min(x1, x2); c <= Math.max(x1, x2); c++)
                            cells.push(cellName(c, r));
                    lastSelectionRef.current = cells;
                },

                /* ── onchange — OPTIMISTIC UI ────────────────────────────────
                   FIX B2: il guard `ignoring.current` è ora anche nella closure
                   del setTimeout dell'auto-sort (via applyAutoSort che lo setta).
                ─────────────────────────────────────────────────────────────── */
                onchange: (instance: any, _cell: any, col: any, row: any, _val: any) => {
                    if (ignoring.current) return;
                    if (String(col) === '11') return; // skip col priorità

                    // Ricalcola priorità local se cambia Ordine (col 0) o Data Cons. (col 4)
                    if (String(col) === '4' || String(col) === '0') {
                        const dataCons = String(instance.jexcel.getValueFromCoords(4, row) || '').toUpperCase();
                        const orderCol = String(instance.jexcel.getValueFromCoords(0, row) || '').trim();
                        const isFT     = dataCons.includes('FT');
                        const isEmpty  = orderCol === '' && dataCons === '';

                        let priority = '0';
                        if (isEmpty)   priority = '2';
                        else if (isFT) priority = '1';

                        // silent=true → non retriggera onchange
                        tableRef.current?.setValueFromCoords(11, row, priority, true);

                        // Auto-sort differito (FIX B2: applyAutoSort setta ignoring)
                        if (instance.tSort) clearTimeout(instance.tSort);
                        instance.tSort = setTimeout(() => {
                            const focusBefore = captureSelection();
                            applyAutoSort(tableRef.current, focusBefore);
                        }, 4000);
                    }

                    // Traccia cambiamento per update chirurgico
                    const cell = cellName(col, row);
                    const newVal = String(_val || '');
                    pendingChanges.current[cell] = newVal;

                    saveData(false);
                },

                onchangestyle: () => { if (!ignoring.current) saveStyle(); },
                oncomments:    () => { if (!ignoring.current) saveComments(); },

                /* ── oninsertrow — OPTIMISTIC UI ── */
                oninsertrow: () => {
                    if (ignoring.current) return;
                    saveData(true);
                },

                /* ── ondeleterow — OPTIMISTIC UI ── ─────────────────────────
                   FIX B6: captureSelection() viene chiamata PRIMA che jspreadsheet
                   aggiorni il DOM. Il focus viene poi ripristinato a y1 invariato
                   (non y1-1), perché dopo la delete le righe successive salgono
                   automaticamente e la coordinata y1 punta già alla riga "precedente".
                ─────────────────────────────────────────────────────────────── */
                ondeleterow: () => {
                    if (ignoring.current) return;
                    const focusBefore = captureSelection();
                    saveData(true);
                    if (focusBefore) {
                        // Dopo delete, la riga in posizione y1 è già la successiva.
                        // Manteniamo il focus sulla stessa coordinata schiacciata verso il basso di max 0.
                        const targetRow = Math.max(0, focusBefore.y1);
                        requestAnimationFrame(() => {
                            restoreSelection({ x1: focusBefore.x1, y1: targetRow, x2: focusBefore.x2, y2: targetRow });
                        });
                    }
                },
            });

            tableRef.current = table;

            /* ⚠️ NON chiamare applyAutoSort qui: i dati sono già sortati
               da prepareSortedData() prima di essere passati a jspreadsheet.
               Una seconda chiamata ri-leggerebbe da getData() che può avere
               un ordine interno diverso e corrompere il sort. */

            // Riapplica commenti dopo ordinamento
            if (init.comments && Object.keys(init.comments).length > 0) {
                setTimeout(() => {
                    try { table.setComments(init.comments); }
                    catch (e) { console.error('[sheet] retry init comments', e); }
                }, 120);
            }

            setLoading(false);
            setSaveState('saved');
            console.log('[sheet] jspreadsheet initialized ✓');

            /* 4 — onSnapshot realtime ─────────────────────────────────────────
               ZERO-GLITCH SYNC — architettura:

               a) blocked.current         → blocca l'ECHO della propria scrittura per 2s.
                  FIX B1: se il dato remoto differisce dal lastWrittenMapRef (un altro
                  utente ha modificato), non blocchiamo: aggiorniamo diff per quella cella.

               b) ignoring.current        → ON durante ogni aggiornamento programmatico.
                  Disattivato sempre nel finally (anche in caso di eccezione).
                  FIX B2: usato anche dentro applyAutoSort/orderBy.

               c) FocusSnapshot           → cattura+ripristina attorno a loadData/orderBy.

               d) structureVersion        → discrimina full-reload (insert/delete) vs diff.

               e) FIX B7: nel diff incrementale iteriamo solo col 0..DATA_COLS-1 (0..10),
                  mai la col 11 (priorità), per non sovrascrivere il valore locale.
            ─────────────────────────────────────────────────────────────────── */
            unsubSnap = onSnapshot(ref, (snap) => {
                if (!snap.exists() || !tableRef.current) return;

                const d = snap.data() as Partial<SheetDoc>;
                const remoteStructVer = d.structureVersion ?? 0;
                const structChanged   = remoteStructVer !== localStructVersion.current;

                /* FIX B1 — Gestione selettiva del blocked:
                   Se blocked=true E il dato remoto coincide con lastWrittenMapRef,
                   è il nostro echo → skippa.
                   Se il dato remoto ha differenze rispetto all'ultimo scritto,
                   un altro utente ha modificato: non skippare, aggiorna quella parte. */
                if (blocked.current && !structChanged) {
                    // Confronta velocemente: se i dati remoti sono identici all'ultimo scritto, skip
                    const remoteKeys = Object.keys(d.data ?? {});
                    const writtenKeys = Object.keys(lastWrittenMapRef.current);
                    const sameSize = remoteKeys.length === writtenKeys.length;
                    if (sameSize) {
                        const allSame = remoteKeys.every(k => (d.data ?? {})[k] === lastWrittenMapRef.current[k]);
                        if (allSame) return; // proprio echo → skip
                    }
                    // Altrimenti: dati diversi → qualcuno ha scritto → procedi con diff
                }

                const focusBefore = captureSelection();
                ignoring.current = true;

                try {
                    if (structChanged) {
                        /* ── FULL RELOAD: insert/delete riga da remoto ── */
                        localStructVersion.current = remoteStructVer;

                        if (d.data) {
                            // prepareSortedData include già sortRows() — nessun orderBy necessario
                            const sorted = prepareSortedData(d.data);
                            tableRef.current.loadData(sorted);
                        }
                        if (d.style && Object.keys(d.style).length > 0)
                            try { tableRef.current.setStyle(d.style); } catch { /**/ }
                        if (d.comments)
                            try { tableRef.current.setComments(d.comments); } catch { /**/ }

                        restoreSelection(focusBefore);
                    } else {
                        /* ── DIFF INCREMENTALE: solo celle modificate ── */
                        if (d.data) {
                            const remote = map2arr(d.data, ROWS, COLS); // FIX B7: già esclude col 11
                            const local: any[][] = tableRef.current.getData();
                            for (let r = 0; r < remote.length; r++) {
                                for (let c = 0; c < DATA_COLS; c++) { // FIX B7: max c < DATA_COLS (11)
                                    const rVal = remote[r][c] ?? '';
                                    const lVal = String(local[r]?.[c] ?? '');
                                    if (rVal !== lVal) {
                                        // silent=true: nessun onchange loop
                                        tableRef.current.setValueFromCoords(c, r, rVal, true);
                                    }
                                }
                            }
                        }
                        if (d.style && Object.keys(d.style).length > 0)
                            try { tableRef.current.setStyle(d.style); } catch { /**/ }
                        if (d.comments)
                            try { tableRef.current.setComments(d.comments); } catch { /**/ }
                        // Nel diff il focus non viene mai toccato (setValueFromCoords non
                        // sposta la selezione) → nessun restoreSelection necessario.
                    }
                } finally {
                    ignoring.current = false; // sempre rilasciato anche in caso di eccezione
                }
            }, (err) => {
                // onSnapshot error handler — FIX B4: mostra stato offline/errore
                console.error('[sheet] onSnapshot error:', err);
                setSaveState(err?.code === 'unavailable' ? 'offline' : 'error');
            });
        })();

        return () => {
            dead = true;
            if (unsubSnap) unsubSnap();
            [tData, tStyle, tComm, tSave, tBlock].forEach(r => { if (r.current) clearTimeout(r.current); });
            try {
                const el = containerRef.current;
                if (el && (el as any).jexcel) (el as any).jexcel.destroy(el, false);
            } catch { /**/ }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authReady, currentId]);

    /* ─── getSelected: versione robusta con fallback ── */
    const getSelected = (): string[] => {
        const t = tableRef.current;
        if (!t) return [];
        try {
            const sel: number[] = t.selectedCell;
            if (sel && sel.length >= 4) {
                const [x1, y1, x2, y2] = [
                    Math.min(sel[0], sel[2]), Math.min(sel[1], sel[3]),
                    Math.max(sel[0], sel[2]), Math.max(sel[1], sel[3]),
                ];
                const out: string[] = [];
                for (let r = y1; r <= y2; r++)
                    for (let c = x1; c <= x2; c++)
                        out.push(cellName(c, r));
                return out;
            }
            return lastSelectionRef.current;
        } catch (e) {
            console.warn('[sheet] getSelected error', e);
            return lastSelectionRef.current;
        }
    };

    /* ─── Toolbar style actions ── */
    const applyStyle = (prop: string, val: string) => {
        const t = tableRef.current;
        if (!t) return;
        const cells = getSelected();
        if (!cells.length) return;
        const obj: Record<string, string> = {};
        for (const cell of cells) obj[cell] = `${prop}: ${val};`;
        t.setStyle(obj);
    };

    const onBgColor  = (e: React.ChangeEvent<HTMLInputElement>) => applyStyle('background-color', e.target.value);
    const onTxtColor = (e: React.ChangeEvent<HTMLInputElement>) => applyStyle('color', e.target.value);

    const onBold = () => {
        const t = tableRef.current;
        if (!t) return;
        const cells = getSelected();
        if (!cells.length) return;
        const obj: Record<string, string> = {};
        for (const cell of cells) {
            const cur: string = t.getStyle(cell) ?? '';
            const isBold = /font-weight\s*:\s*bold/.test(cur);
            obj[cell] = isBold ? 'font-weight: normal;' : 'font-weight: bold;';
        }
        t.setStyle(obj);
    };

    /* ── Save badge UI ── */
    const SaveBadge = () => {
        switch (saveState) {
            case 'saving':
                return <div style={S.syncing}><Loader2 size={13} className="animate-spin" /><span>Sincronizzazione...</span></div>;
            case 'error':
                return <div style={S.error}><AlertCircle size={13} /><span>Errore salvataggio — riprovando...</span></div>;
            case 'offline':
                return <div style={S.offline}><WifiOff size={13} /><span>Offline — in attesa di connessione</span></div>;
            case 'saved':
            default:
                return <div style={S.saved}><Check size={13} /><span>Salvato</span></div>;
        }
    };

    /* ════════════════════════════════════════════════════
       RENDER — containerRef SEMPRE nel DOM
    ════════════════════════════════════════════════════ */
    return (
        <div style={S.page}>

            {/* Overlay di caricamento */}
            {loading && (
                <div style={S.overlay}>
                    <Loader2 style={{ width: 44, height: 44, color: '#3b82f6', marginBottom: 14 }} className="animate-spin" />
                    <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500, margin: 0 }}>
                        Inizializzazione Spreadsheet...
                    </p>
                </div>
            )}

            {/* Header */}
            {!loading && (
                <header style={S.header}>
                    <div style={S.left}>
                        <h1 style={S.title}>ORDINI</h1>
                        <input
                            type="text"
                            placeholder="🔍 Cerca nella tabella..."
                            style={S.customSearch}
                            onChange={handleSearch}
                            onKeyDown={(e) => { e.stopPropagation(); }}
                        />
                    </div>

                    {/* Toolbar */}
                    <div style={S.toolbar}>
                        <div style={{ position: 'relative' }}>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => bgRef.current?.click()} style={S.tbBtn} title="Colore Sfondo">
                                <Paintbrush size={14} onMouseDown={(e) => e.preventDefault()} />
                                <span onMouseDown={(e) => e.preventDefault()}>Sfondo</span>
                            </button>
                            <input ref={bgRef} type="color" defaultValue="#ffff00" onChange={onBgColor} style={S.hiddenColor} />
                        </div>

                        <span style={S.sep} />

                        <div style={{ position: 'relative' }}>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => txtRef.current?.click()} style={S.tbBtn} title="Colore Testo">
                                <Type size={14} onMouseDown={(e) => e.preventDefault()} />
                                <span onMouseDown={(e) => e.preventDefault()}>Testo</span>
                            </button>
                            <input ref={txtRef} type="color" defaultValue="#000000" onChange={onTxtColor} style={S.hiddenColor} />
                        </div>

                        <span style={S.sep} />

                        <button onMouseDown={(e) => e.preventDefault()} onClick={onBold} style={S.tbBtn} title="Grassetto">
                            <Bold size={14} onMouseDown={(e) => e.preventDefault()} />
                            <span onMouseDown={(e) => e.preventDefault()}>Grassetto</span>
                        </button>

                        <span style={S.sep} />
                    </div>

                    {/* Save badge */}
                    <div><SaveBadge /></div>
                </header>
            )}

            {/* Contenitore Jspreadsheet — SEMPRE nel DOM */}
            <main style={S.main}>
                <div ref={containerRef} style={S.grid} />
            </main>
        </div>
    );
};

/* ─── Stili ─── */
const S: Record<string, React.CSSProperties> = {
    page: {
        display: 'flex', flexDirection: 'column',
        height: '100vh', width: '100vw', overflow: 'hidden',
        backgroundColor: '#f1f5f9',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        position: 'relative',
    },
    overlay: {
        position: 'absolute', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f1f5f9',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 40, minHeight: 40, flexShrink: 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 20, gap: 10,
    },
    left: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
    title: { fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, paddingRight: 10 },
    customSearch: {
        marginLeft: '10px', padding: '7px 14px', borderRadius: '8px',
        border: '1px solid #94a3b8', fontSize: '13px', fontWeight: '500',
        width: '320px', outline: 'none', backgroundColor: '#ffffff', color: '#000000',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', transition: 'all 0.2s',
    },
    toolbar: {
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '3px 10px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0', borderRadius: 9,
        flexShrink: 0,
    },
    tbBtn: {
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', border: 'none', borderRadius: 6,
        background: 'transparent', color: '#475569',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
    },
    sep: { width: 1, height: 18, backgroundColor: '#e2e8f0', margin: '0 2px', display: 'inline-block' },
    hiddenColor: { position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' },
    syncing: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8,
        backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600,
    },
    saved: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8,
        backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 600,
    },
    error: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8,
        backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12, fontWeight: 600,
    },
    offline: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8,
        backgroundColor: '#fefce8', color: '#92400e', border: '1px solid #fde68a', fontSize: 12, fontWeight: 600,
    },
    main: { flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' },
    grid: { width: '100%', height: '100%', overflow: 'auto' },
};

export default SharedSheet;
