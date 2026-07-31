/**
 * Utility per la gestione e normalizzazione delle date nel sistema Assistenza SK.
 */

/**
 * Tenta di analizzare una stringa di data in vari formati comuni.
 * Ignora codici alfanumerici come "2025_FT34".
 * @param dateStr La stringa da analizzare
 * @returns Un oggetto Date o null se il formato non è riconosciuto o è un codice da ignorare
 */
/**
 * Tenta di analizzare una stringa di data in vari formati comuni.
 * @param dateStr La stringa da analizzare
 * @param rowId Opzionale: ID riga per il log in caso di errore
 * @returns Un oggetto Date o null se il formato non è riconosciuto
 */
export const parseSheetDate = (dateStr: string | undefined, rowId?: string): Date | null => {
    if (!dateStr) return null;
    const s = dateStr.trim();
    if (!s || s === '---') return null;

    // Ignora codici tecnici palesi (es. 2025_FT34)
    if ((s.includes('_') || (/[a-z]/i.test(s) && !s.includes('T') && !s.includes('Z') && !s.includes('alle')))) {
        // Se sembra un codice tecnico e non contiene indicatori di tempo, saltiamo silenziosamente
        return null;
    }

    try {
        // 1. Supporto Date ISO (es. 2026-05-14T08:30)
        if (s.includes('T') || (s.includes('-') && s.length > 10)) {
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
        }

        // 2. Formato GG/MM/AAAA [HH:mm] o GG/MM/AA
        if (s.includes('/')) {
            const dateTimeParts = s.split(/\s+/);
            const dateParts = dateTimeParts[0].split('/');
            if (dateParts.length === 3) {
                const day = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10);
                let year = parseInt(dateParts[2], 10);
                if (year < 100) year += 2000;
                
                const date = new Date(year, month - 1, day);
                
                const timePart = dateTimeParts.find(p => p.includes(':'));
                if (timePart) {
                    const cleanTime = timePart.replace(/[^0-9:]/g, '');
                    const [h, min] = cleanTime.split(':').map(n => parseInt(n, 10));
                    if (!isNaN(h)) date.setHours(h);
                    if (!isNaN(min)) date.setMinutes(min || 0);
                } else {
                    date.setHours(12, 0, 0, 0);
                }
                if (!isNaN(date.getTime())) return date;
            }
        }

        // 3. Formato AAAA-MM-GG o GG-MM-AAAA
        if (s.includes('-')) {
            const dateTimeParts = s.split(/\s+/);
            const parts = dateTimeParts[0].split('-');
            if (parts.length === 3) {
                let date: Date;
                if (parts[0].length === 4) { // AAAA-MM-GG
                    date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else { // GG-MM-AAAA
                    let y = parseInt(parts[2], 10);
                    if (y < 100) y += 2000;
                    date = new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                }
                
                const timePart = dateTimeParts.find(p => p.includes(':'));
                if (timePart && !isNaN(date.getTime())) {
                    const cleanTime = timePart.replace(/[^0-9:]/g, '');
                    const [h, min] = cleanTime.split(':').map(n => parseInt(n, 10));
                    if (!isNaN(h)) date.setHours(h);
                    if (!isNaN(min)) date.setMinutes(min || 0);
                } else {
                    date.setHours(12, 0, 0, 0);
                }
                if (!isNaN(date.getTime())) return date;
            }
        }

        // 4. Fallback estremo
        const fallback = new Date(s);
        if (!isNaN(fallback.getTime())) return fallback;

    } catch (e) {
        // Silenzioso
    }

    // Se arriviamo qui e abbiamo un rowId, logghiamo l'errore come richiesto
    if (rowId && s.length > 5) {
        console.warn(`[DateParser] Formato data non valido per Riga/ID: ${rowId} -> "${s}"`);
    }

    return null;
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
