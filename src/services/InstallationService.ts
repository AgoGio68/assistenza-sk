import { Installation } from '../types';

export const fetchInstallations = async (sheetUrl: string): Promise<Installation[]> => {
    try {
        const sheetIdMatch = sheetUrl.match(/\/d\/([^/]+)/);
        if (!sheetIdMatch) throw new Error("Invalid Google Sheet URL");

        const sheetId = sheetIdMatch[1];
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

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
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const dataLines = lines.slice(1);

    return dataLines.map((line, index) => {
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

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
            isInvoiced: autoInvoiced // Campo dinamico derivato dal foglio
        };
    }).filter(inst => inst.client !== '');
};
