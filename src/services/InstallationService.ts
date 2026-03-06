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

    return dataLines.map((parts, index) => {

        const deliveryDateRaw = parts[4] || '';
        // v2.0.0: Rilevamento automatico fatturazione
        // Se contiene "FT" o ha un formato tipo "2025_FT..." (lungo e con underscore/numeri)
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
            // Cerca la colonna delle 'Note Estratte' in qualsiasi posizione dopo i commenti 
            // per essere resiliente a eventuali colonne vuote lasciate nel foglio Google
            extractedNotes: parts.slice(9).find(p => p.trim() !== '') || '',

            isInvoiced: autoInvoiced // Campo dinamico derivato dal foglio
        };
    }).filter(inst => inst.client !== '');
};
