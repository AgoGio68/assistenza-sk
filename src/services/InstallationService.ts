import { Installation } from '../types';

export const fetchInstallations = async (sheetUrl: string): Promise<Installation[]> => {
    try {
        const sheetIdMatch = sheetUrl.match(/\/d\/([^/]+)/);
        if (!sheetIdMatch) throw new Error("Invalid Google Sheet URL");

        const sheetId = sheetIdMatch[1];

        // Cattura il GID dal link fornito per scaricare il tab corretto, non sempre il primo
        const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';

        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error("Failed to fetch sheet data. Ensure the sheet is public.");

        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error("Error fetching installations:", error);
        throw error;
    }
};

const parseCSV = (csvText: string): Installation[] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"'; // Escaped quote
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            if (char === '\r') i++; // Skip the \n part of \r\n
            if (currentCell || currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            }
        } else {
            currentCell += char;
        }
    }
    // Aggiungi l'ultima cella/riga se il file non finisce con \n
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const dataLines = rows.slice(1);

    return dataLines.map((parts, index): Installation | null => {
        if (!parts || parts.length < 4) return null;
        
        // v2.2.37: Cerchiamo l'indice riga originale. Lo script lo mette nell'ultima colonna o giù di lì.
        let detectedRowIndex = '';
        for (let i = parts.length - 1; i >= 9; i--) {
            const val = (parts[i] || '').trim();
            if (val && /^\d+$/.test(val)) {
                detectedRowIndex = val;
                break;
            }
        }
        if (!detectedRowIndex) detectedRowIndex = (index + 2).toString();

        const deliveryDateRaw = parts[4] || '';
        // v2.0.0: Rilevamento automatico fatturazione
        const autoInvoiced = /FT/i.test(deliveryDateRaw) || (deliveryDateRaw.includes('_') && deliveryDateRaw.length > 5);

        return {
            rowId: `row-${index}`,
            orderNumber: parts[0] || '',
            client: parts[1] || '',
            machine: parts[2] || '',
            installationSite: parts[3] || '',
            deliveryDate: deliveryDateRaw,
            modelSK: parts[5] || '',
            serialSK: parts[6] || '',
            installDate: parts[7] || '',
            comments: parts[8] || '',
            extractedNotes: (parts[5] && parts[5].trim().startsWith('***')) 
                ? parts[5].trim() 
                // Consideriamo appunti sparsi fino alla colonna Y (index 24), escludendo Z (index 25) che è riservata all'ID stabile
                : (parts.slice(9, 25).find(p => p.trim() !== '' && !p.startsWith('inst-') && !p.startsWith('manual-')) || ''),

            originalRowIndex: detectedRowIndex,
            _firestoreId: parts[25] || undefined, // Colonna Z: Stable ID
            isInvoiced: autoInvoiced 
        };
    }).filter((inst): inst is Installation => inst !== null && !!inst.client);
};

/**
 * Aggiorna i dati di un'installazione direttamente sul foglio Google "ORDINI".
 * Richiede che la Google Sheets API sia abilitata e il token abbia lo scope appropriato.
 */
export const updateInstallationOnSheet = async (
    spreadsheetUrl: string,
    googleToken: string,
    rowIndex: string,
    data: {
        installDate?: string;
        serialSK?: string;
        comments?: string;
        tested?: boolean;
    }
) => {
    try {
        const sheetIdMatch = spreadsheetUrl.match(/\/d\/([^/]+)/);
        if (!sheetIdMatch) throw new Error("URL foglio non valido.");
        const spreadsheetId = sheetIdMatch[1];

        // Cattura il GID dal link fornito per operare sul tab corretto

        // 1. Aggiornamento VALORI (Data, Matricola, Commenti)
        const ranges: string[] = [];
        const values: any[][] = [];

        if (data.serialSK !== undefined) {
            ranges.push(`ORDINI!G${rowIndex}`);
            values.push([data.serialSK]);
        }
        if (data.installDate !== undefined) {
            ranges.push(`ORDINI!H${rowIndex}`);
            values.push([data.installDate]);
        }
        if (data.comments !== undefined) {
            ranges.push(`ORDINI!I${rowIndex}`);
            values.push([data.comments]);
        }

        if (ranges.length > 0) {
            const valResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        valueInputOption: 'USER_ENTERED',
                        data: ranges.map((range, i) => ({
                            range,
                            values: [values[i]]
                        }))
                    })
                }
            );

            if (!valResponse.ok) {
                const err = await valResponse.json();
                throw new Error(err.error?.message || "Errore durante l'aggiornamento dei valori.");
            }
        }

        // 2. Aggiornamento FORMATO (Colori riga)
        // Recuperiamo dinamicamente il GID del foglio chiamato "ORDINI"
        // Questo evita di dover inserire il GID preciso nell'URL delle impostazioni
        let targetGid = 0;
        try {
            const metaResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,sheetId))`,
                {
                    headers: { 'Authorization': `Bearer ${googleToken}` }
                }
            );
            if (metaResponse.ok) {
                const meta = await metaResponse.json();
                const ordiniSheet = meta.sheets?.find((s: any) => s.properties.title === 'ORDINI');
                if (ordiniSheet) {
                    targetGid = ordiniSheet.properties.sheetId;
                }
            }
        } catch (e) {
            console.warn("Could not fetch sheet metadata, stalling with GID 0", e);
        }

        const greenColor = { red: 0, green: 1, blue: 0 };    // Verde puro/vivace (come da foto)
        const yellowColor = { red: 1, green: 1, blue: 0 };   // Giallo puro/vivace (come da foto)
        const intRow = parseInt(rowIndex) - 1;
        
        const formatResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${googleToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: targetGid,
                                    startRowIndex: intRow,
                                    endRowIndex: intRow + 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: 26 // Colonne A-Z
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: data.tested ? greenColor : yellowColor,
                                        textFormat: {
                                            fontFamily: 'Calibri',
                                            fontSize: 16
                                        }
                                    }
                                },
                                fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat'
                            }
                        }
                    ]
                })
            }
        );

        if (!formatResponse.ok) {
            const err = await formatResponse.json();
            console.error("Format update error:", err);
            // Non blocchiamo del tutto se solo il colore fallisce, ma segnaliamo in console
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating sheet:", error);
        throw error;
    }
};

/**
 * Aggiunge un'installazione manuale come nuova riga.
 * Se insertAtTop è true, la inserisce in riga 2 (sotto l'intestazione).
 * Se false, la appende in fondo.
 */
export const appendInstallationToSheet = async (
    spreadsheetUrl: string,
    googleToken: string,
    data: Installation,
    insertAtTop: boolean = false
): Promise<string | null> => {
    try {
        const sheetIdMatch = spreadsheetUrl.match(/\/d\/([^/]+)/);
        if (!sheetIdMatch) throw new Error("URL foglio non valido.");
        const spreadsheetId = sheetIdMatch[1];

        // Recuperiamo il GID del foglio "ORDINI"
        let targetGid = 0;
        try {
            const metaResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,sheetId))`,
                { headers: { 'Authorization': `Bearer ${googleToken}` } }
            );
            if (metaResponse.ok) {
                const meta = await metaResponse.json();
                const ordiniSheet = meta.sheets?.find((s: any) => s.properties.title === 'ORDINI');
                if (ordiniSheet) targetGid = ordiniSheet.properties.sheetId;
            }
        } catch (e) {
            console.warn("Could not fetch sheet metadata", e);
        }

        const baseRow = [
            data.orderNumber || '',
            data.client || '',
            data.machine || '',
            data.installationSite || '',
            data.deliveryDate || '',
            data.modelSK || '',
            data.serialSK || '',
            data.installDate || '',
            data.comments || ''
        ];

        // Pad the row with empty strings up to index 24 (Column Y)
        while (baseRow.length < 25) {
            baseRow.push('');
        }
        
        // Colonna Z (index 25): Stable ID
        baseRow.push(data._firestoreId || '');

        const values = [baseRow];

        if (insertAtTop) {
            // 1. Inseriamo una riga vuota alla posizione 2 (index 1)
            const insertReq = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        requests: [{
                            insertDimension: {
                                range: {
                                    sheetId: targetGid,
                                    dimension: 'ROWS',
                                    startIndex: 1,
                                    endIndex: 2
                                },
                                inheritFromBefore: false
                            }
                        }]
                    })
                }
            );

            if (!insertReq.ok) throw new Error("Errore durante l'inserimento della riga in cima.");

            // 2. Scriviamo i valori in A2:J2
            const updateReq = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ORDINI!A2:Z2?valueInputOption=USER_ENTERED`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${googleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ values })
                }
            );

            if (!updateReq.ok) throw new Error("Errore durante la scrittura dei dati in cima.");

            // 3. Applichiamo il formato (Sfondo Bianco, Calibri 16)
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        requests: [{
                            repeatCell: {
                                range: {
                                    sheetId: targetGid,
                                    startRowIndex: 1,
                                    endRowIndex: 2,
                                    startColumnIndex: 0,
                                    endColumnIndex: 26
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 1, green: 1, blue: 1 },
                                        textFormat: { fontFamily: 'Calibri', fontSize: 16 }
                                    }
                                },
                                fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat'
                            }
                        }]
                    })
                }
            );

            return "2";
        } else {
            // Logica append standard
            const appendResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ORDINI!A:Z:append?valueInputOption=USER_ENTERED`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ values })
                }
            );

            if (!appendResponse.ok) {
                const err = await appendResponse.json();
                throw new Error(err.error?.message || "Errore durante l'aggiunta della riga.");
            }

            const appendData = await appendResponse.json();
            let newRowIndex: string | null = null;
            
            if (appendData.updates && appendData.updates.updatedRange) {
                const matchRow = appendData.updates.updatedRange.match(/:[A-Z]+(\d+)$/);
                if (matchRow && matchRow[1]) {
                    newRowIndex = matchRow[1];
                } else {
                    const matchStart = appendData.updates.updatedRange.match(/![A-Z]+(\d+)/);
                    if (matchStart && matchStart[1]) {
                         newRowIndex = matchStart[1];
                    }
                }
            }

            if (newRowIndex) {
                await updateInstallationOnSheet(spreadsheetUrl, googleToken, newRowIndex, { tested: !!data.tested });
            }

            return newRowIndex;
        }
    } catch (error) {
        console.error("Error appending to sheet:", error);
        throw error;
    }
};

/**
 * Rimuove definitivamente una riga dal foglio Google "ORDINI".
 */
export const deleteInstallationFromSheet = async (
    spreadsheetUrl: string,
    googleToken: string,
    rowIndex: string
): Promise<void> => {
    try {
        const sheetIdMatch = spreadsheetUrl.match(/\/d\/([^/]+)/);
        if (!sheetIdMatch) throw new Error("URL foglio non valido.");
        const spreadsheetId = sheetIdMatch[1];

        let targetGid = 0;
        try {
            const metaResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,sheetId))`,
                { headers: { 'Authorization': `Bearer ${googleToken}` } }
            );
            if (metaResponse.ok) {
                const meta = await metaResponse.json();
                const ordiniSheet = meta.sheets?.find((s: any) => s.properties.title === 'ORDINI');
                if (ordiniSheet) targetGid = ordiniSheet.properties.sheetId;
            }
        } catch (e) {
            console.warn("Could not fetch sheet metadata for deletion", e);
        }

        const intRow = parseInt(rowIndex) - 1;

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${googleToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: targetGid,
                                dimension: 'ROWS',
                                startIndex: intRow,
                                endIndex: intRow + 1
                            }
                        }
                    }]
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Errore durante la cancellazione della riga.");
        }
    } catch (error) {
        console.error("Error deleting from sheet:", error);
        throw error;
    }
};
