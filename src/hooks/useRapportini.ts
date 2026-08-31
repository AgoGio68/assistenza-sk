/**
 * useRapportini — Hook React per gestire lo stato dei rapportini
 *
 * Fornisce la lista rapportini real-time, badge count per admin,
 * e funzioni di azione (archivia, elimina, aggiorna).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Rapportino,
    subscribeRapportini,
    subscribeRapportiniByTecnico,
    aggiornaRapportino,
    eliminaRapportino,
} from '../services/RapportiniService';

// ─── Hook Admin: tutti i rapportini ──────────────────────────────────────────

export function useAllRapportini(limit = 500) {
    const [lista, setLista] = useState<Rapportino[]>([]);
    const [loading, setLoading] = useState(true);
    const prevLengthRef = useRef<number | null>(null);
    const [hasNewItems, setHasNewItems] = useState(false);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 6000);

        try {
            unsub = subscribeRapportini(
                limit,
                (data) => {
                    clearTimeout(safetyTimeout);
                    if (prevLengthRef.current !== null && data.length > prevLengthRef.current) {
                        setHasNewItems(true);
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.play().catch(() => {});
                        } catch {}
                    }
                    prevLengthRef.current = data.length;
                    setLista(data);
                    setLoading(false);
                },
                (err) => {
                    clearTimeout(safetyTimeout);
                    console.error("Errore fetch useAllRapportini:", err);
                    setLoading(false);
                }
            );
        } catch (err) {
            clearTimeout(safetyTimeout);
            console.error("Crash protetto in useAllRapportini:", err);
            setLoading(false);
        }
        return () => {
            clearTimeout(safetyTimeout);
            unsub?.();
        };
    }, [limit]);


    const badgeCount = lista.filter((r) => (r.stato || 'nuovo') === 'nuovo').length;

    const clearNewItems = useCallback(() => setHasNewItems(false), []);

    const archivia = useCallback(async (id: string) => {
        const r = lista.find((x) => x.id === id);
        if (r?.attesa) {
            alert("⚠️ Impossibile archiviare un rapportino in stato 'ATTESA'!");
            return;
        }
        await aggiornaRapportino(id, {
            stato: 'processato',
            dataProcesso: new Date().toLocaleString(),
        });
    }, [lista]);

    const ripristina = useCallback(async (id: string) => {
        await aggiornaRapportino(id, { stato: 'nuovo' });
    }, []);

    const aggiornaNota = useCallback(async (id: string, note: string) => {
        await aggiornaRapportino(id, { note });
    }, []);

    const setAttesa = useCallback(async (id: string, attesa: boolean) => {
        await aggiornaRapportino(id, { attesa });
    }, []);

    const setLavorato = useCallback(async (id: string, lavorato: boolean, operatore: string) => {
        const adesso = new Date().toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        await aggiornaRapportino(id, {
            lavorato,
            operatoreGestione: lavorato ? `${operatore.toUpperCase()} - ${adesso}` : '-',
        });
    }, []);

    const elimina = useCallback(async (id: string) => {
        const r = lista.find((x) => x.id === id);
        await eliminaRapportino(id, r?.fotoUrl);
    }, [lista]);

    return {
        lista,
        loading,
        badgeCount,
        hasNewItems,
        clearNewItems,
        archivia,
        ripristina,
        aggiornaNota,
        setAttesa,
        setLavorato,
        elimina,
    };
}

// ─── Hook Tecnico: solo i propri rapportini ───────────────────────────────────

export function useMyRapportini(nomeTecnico: string, limit = 30) {
    const [lista, setLista] = useState<Rapportino[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!nomeTecnico) return;
        const unsub = subscribeRapportiniByTecnico(nomeTecnico, limit, (data) => {
            setLista(data);
            setLoading(false);
        });
        return unsub;
    }, [nomeTecnico, limit]);

    return { lista, loading };
}
