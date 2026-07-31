/**
 * Utility per la gestione e normalizzazione delle date nel sistema Assistenza SK.
 */

/**
 * Tenta di analizzare una stringa di data in vari formati comuni.
 * Ignora codici alfanumerici come "2025_FT34".
 * @param dateStr La stringa da analizzare
 * @returns Un oggetto Date o null se il formato non è riconosciuto o è un codice da ignorare
 */
export const parseSheetDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const s = dateStr.trim();
    if (!s) return null;

    // Ignora codici come 2025_FT34 (contengono underscore e lettere)
    if (s.includes('_') || /[a-zA-Z]/.test(s)) {
        // Eccezione: formato ISO (contiene T e Z)
        if (!s.includes('T') && !s.includes('Z')) {
            return null;
        }
    }

    // Formato GG/MM/AAAA o GG/MM/AA
    if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            let y = parseInt(parts[2], 10);
            if (y < 100) y += 2000;
            const date = new Date(y, m - 1, d);
            return isNaN(date.getTime()) ? null : date;
        }
    }

    // Formato AAAA-MM-GG (ISO Date)
    if (s.includes('-')) {
        const parts = s.split('-');
        if (parts.length === 3) {
            // Verifica se è AAAA-MM-GG o GG-MM-AAAA
            if (parts[0].length === 4) {
                const date = new Date(s);
                return isNaN(date.getTime()) ? null : date;
            } else {
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                let y = parseInt(parts[2], 10);
                if (y < 100) y += 2000;
                const date = new Date(y, m - 1, d);
                return isNaN(date.getTime()) ? null : date;
            }
        }
    }

    // Tenta il parsing standard come ultima spiaggia
    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Formatta una data in formato ISO GG/MM/AAAA per la visualizzazione o salvataggio spreadsheet.
 */
export const formatToSheetDate = (date: Date): string => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

/**
 * Formatta una data in formato ISO AAAA-MM-GG per i campi input datetime-local.
 */
export const formatToISODate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};
