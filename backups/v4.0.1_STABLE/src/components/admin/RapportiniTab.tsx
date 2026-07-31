/**
 * RapportiniTab — Dashboard admin per la gestione rapportini
 *
 * Replica la logica di gestione.html ma integrata nel pannello admin React.
 * Mostra i rapportini dal Realtime Database di rapportini-dfv in real-time.
 */
import React, { useState, useMemo } from 'react';
import {
    CheckSquare,
    Archive,
    Trash2,
    RotateCcw,
    BarChart2,
    Clock,
    Search,
    RefreshCw,
    Image as ImageIcon,
    AlertTriangle,
} from 'lucide-react';
import { useAllRapportini } from '../../hooks/useRapportini';
import { Rapportino } from '../../services/RapportiniService';
import { useAuth } from '../../contexts/AuthContext';

type TabView = 'nuovo' | 'processato';

export const RapportiniTab: React.FC = () => {
    const { userProfile } = useAuth();
    const operatoreNome = userProfile?.displayName || userProfile?.email || 'Operatore';

    const {
        lista,
        loading,
        hasNewItems,
        clearNewItems,
        archivia,
        ripristina,
        aggiornaNota,
        setAttesa,
        setLavorato,
        elimina,
    } = useAllRapportini(500);

    const [tabView, setTabView] = useState<TabView>('nuovo');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [statsView, setStatsView] = useState<'settimana' | 'mese' | 'totale' | null>(null);

    // Flash notifica nuovi
    React.useEffect(() => {
        if (hasNewItems) {
            const t = setTimeout(() => clearNewItems(), 5000);
            return () => clearTimeout(t);
        }
    }, [hasNewItems, clearNewItems]);

    // ─── Filtri ────────────────────────────────────────────────────────────

    const filtrati = useMemo(() => {
        let items = lista.filter((r) => (r.stato || 'nuovo') === tabView);

        if (searchQuery) {
            items = items.filter((r) =>
                (r.tecnico || '').toLowerCase().includes(searchQuery.toLowerCase()),
            );
        }

        if (searchDate) {
            const [y, m, d] = searchDate.split('-');
            const dataCercata = `${d}/${m}/${y}`;
            items = items.filter((r) => r.data && r.data.includes(dataCercata));
        }

        return items;
    }, [lista, tabView, searchQuery, searchDate]);

    const nuoviCount = lista.filter((r) => (r.stato || 'nuovo') === 'nuovo').length;
    const processatiCount = lista.filter((r) => r.stato === 'processato').length;

    // ─── Selezione massiva ─────────────────────────────────────────────────

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(filtrati.map((r) => r.id)) : new Set());
    };

    const bulkArchivia = async () => {
        if (selectedIds.size === 0) return;
        const items = lista.filter((r) => selectedIds.has(r.id) && !r.attesa);
        const bloccati = selectedIds.size - items.length;
        await Promise.all(items.map((r) => archivia(r.id)));
        if (bloccati > 0) alert(`${bloccati} rapportini in ATTESA non archiviati.`);
        setSelectedIds(new Set());
    };

    const bulkElimina = async () => {
        if (selectedIds.size === 0) return;
        if (
            !window.confirm(
                `ATTENZIONE!\nStai per eliminare ${selectedIds.size} rapportini in modo DEFINITIVO.\n\nVerranno rimosse anche le FOTO dal server.\nContinuare?`,
            )
        )
            return;
        await Promise.all([...selectedIds].map((id) => elimina(id)));
        setSelectedIds(new Set());
    };

    // ─── Statistiche ───────────────────────────────────────────────────────

    const computeStats = (periodo: 'settimana' | 'mese' | 'totale') => {
        const ora = new Date();
        const conteggio: Record<string, number> = {};
        lista.forEach((r) => {
            try {
                if (!r.data) return;
                const partiData = r.data.split(',')[0].split('/');
                const dataR = new Date(
                    parseInt('20' + partiData[2]),
                    parseInt(partiData[1]) - 1,
                    parseInt(partiData[0]),
                );
                let valido = true;
                if (periodo === 'settimana') valido = ora.getTime() - dataR.getTime() <= 7 * 86400000;
                if (periodo === 'mese') valido = ora.getTime() - dataR.getTime() <= 30 * 86400000;
                if (valido) conteggio[r.tecnico] = (conteggio[r.tecnico] || 0) + 1;
            } catch {}
        });
        return Object.entries(conteggio).sort((a, b) => b[1] - a[1]);
    };

    const statsData = statsView ? computeStats(statsView) : [];

    // ─── Render ────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }} />
                <p style={{ marginTop: '1rem' }}>Caricamento rapportini...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Notifica nuovi rapportini */}
            {hasNewItems && (
                <div
                    style={{
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                        border: '1px solid rgba(34,197,94,0.4)',
                        borderRadius: 'var(--border-radius-lg)',
                        padding: '0.75rem 1.25rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        animation: 'fadeInUp 0.3s ease',
                    }}
                >
                    <span style={{ fontSize: '1.25rem' }}>🆕</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>
                        Nuovo rapportino ricevuto!
                    </span>
                </div>
            )}

            {/* Barra controlli */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginBottom: '1rem',
                }}
            >
                <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
                    <Search
                        size={14}
                        style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Cerca tecnico..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem 0.55rem 2rem',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--border-radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                        }}
                    />
                </div>
                <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    style={{
                        padding: '0.55rem 0.75rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--border-radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                    }}
                />
                <button
                    className={`btn ${selectedIds.size > 0 ? 'btn-primary' : ''}`}
                    onClick={bulkArchivia}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
                    disabled={selectedIds.size === 0}
                >
                    <Archive size={15} /> Archivia ({selectedIds.size})
                </button>
                <button
                    onClick={() => setStatsView(statsView ? null : 'totale')}
                    className={`btn ${statsView ? 'btn-primary' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
                >
                    <BarChart2 size={15} /> Stats
                </button>
                <button
                    className="btn"
                    onClick={bulkElimina}
                    disabled={selectedIds.size === 0}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.82rem',
                        padding: '0.5rem 0.85rem',
                        color: selectedIds.size > 0 ? 'var(--danger-color)' : undefined,
                        borderColor: selectedIds.size > 0 ? 'rgba(239,68,68,0.3)' : undefined,
                    }}
                >
                    <Trash2 size={15} /> Elimina
                </button>
            </div>

            {/* Panel statistiche */}
            {statsView && (
                <div
                    className="glass-panel"
                    style={{
                        marginBottom: '1rem',
                        padding: '1rem 1.25rem',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--border-radius-lg)',
                        background: 'var(--bg-surface)',
                    }}
                >
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {(['settimana', 'mese', 'totale'] as const).map((p) => (
                            <button
                                key={p}
                                className={`btn ${statsView === p ? 'btn-primary' : ''}`}
                                onClick={() => setStatsView(p)}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {statsData.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nessun dato trovato.</p>
                    ) : (
                        statsData.map(([nome, num]) => (
                            <div
                                key={nome}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.6rem 0',
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}
                            >
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nome}</span>
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color: 'var(--primary-color)',
                                        background: 'rgba(99,102,241,0.12)',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '100px',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {num} invii
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tabs DA GESTIRE / ARCHIVIO */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    borderBottom: '2px solid var(--border-subtle)',
                    paddingBottom: '0',
                }}
            >
                {(['nuovo', 'processato'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTabView(t); setSelectedIds(new Set()); }}
                        style={{
                            padding: '0.65rem 1.1rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: tabView === t ? '2px solid var(--primary-color)' : '2px solid transparent',
                            color: tabView === t ? 'var(--primary-color)' : 'var(--text-muted)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '-2px',
                            transition: 'color 0.2s',
                        }}
                    >
                        {t === 'nuovo' ? 'DA GESTIRE' : 'ARCHIVIO'}
                        <span
                            style={{
                                background: tabView === t ? 'var(--primary-color)' : 'var(--bg-elevated)',
                                color: tabView === t ? 'white' : 'var(--text-muted)',
                                borderRadius: '100px',
                                padding: '0 7px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                lineHeight: '1.5',
                            }}
                        >
                            {t === 'nuovo' ? nuoviCount : processatiCount}
                        </span>
                    </button>
                ))}
            </div>

            {/* Lista rapportini */}
            {filtrati.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: 'var(--border-radius-lg)',
                    }}
                >
                    <ImageIcon size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                    <p>
                        {tabView === 'nuovo'
                            ? 'Nessun rapportino da gestire 🎉'
                            : 'Nessun rapportino in archivio'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Header selezione */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <input
                            type="checkbox"
                            checked={filtrati.length > 0 && selectedIds.size === filtrati.length}
                            onChange={(e) => toggleAll(e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {selectedIds.size > 0 ? `${selectedIds.size} selezionati` : `${filtrati.length} rapportini`}
                        </span>
                    </div>

                    {filtrati.map((r) => (
                        <RapportiniCard
                            key={r.id}
                            r={r}
                            tabView={tabView}
                            isSelected={selectedIds.has(r.id)}
                            operatoreNome={operatoreNome}
                            onToggleSelect={() => toggleSelect(r.id)}
                            onArchivia={() => archivia(r.id)}
                            onRipristina={() => ripristina(r.id)}
                            onElimina={() => elimina(r.id)}
                            onSetAttesa={(v) => setAttesa(r.id, v)}
                            onSetLavorato={(v) => setLavorato(r.id, v, operatoreNome)}
                            onSetNota={(n) => aggiornaNota(r.id, n)}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

// ─── Card singolo rapportino ──────────────────────────────────────────────────

interface CardProps {
    r: Rapportino;
    tabView: TabView;
    isSelected: boolean;
    operatoreNome: string;
    onToggleSelect: () => void;
    onArchivia: () => void;
    onRipristina: () => void;
    onElimina: () => void;
    onSetAttesa: (v: boolean) => void;
    onSetLavorato: (v: boolean) => void;
    onSetNota: (n: string) => void;
}

const RapportiniCard: React.FC<CardProps> = ({
    r, tabView, isSelected, onToggleSelect,
    onArchivia, onRipristina, onElimina,
    onSetAttesa, onSetLavorato, onSetNota,
}) => {
    const [nota, setNota] = useState(r.note || '');
    const isInAttesa = r.attesa === true;
    const canArchivia = tabView === 'nuovo' && !isInAttesa;

    return (
        <div
            className="glass-panel"
            style={{
                background: isSelected ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface)',
                border: `1px solid ${isSelected ? 'rgba(99,102,241,0.35)' : isInAttesa ? 'rgba(234,179,8,0.3)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--border-radius-lg)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'border-color 0.2s',
            }}
        >
            {/* Riga superiore: checkbox + foto + info + azioni */}
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 4, flexShrink: 0 }}
                />

                {/* Thumbnail foto */}
                <img
                    src={r.fotoUrl}
                    alt="rapportino"
                    style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                    }}
                    onClick={() => window.open(r.fotoUrl, '_blank')}
                    title="Clicca per aprire a schermo intero"
                />

                {/* Dettagli */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {r.tecnico || 'N/A'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={12} /> {r.data}
                    </div>
                    {r.operatoreGestione && r.operatoreGestione !== '-' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            ✍️ {r.operatoreGestione}
                        </div>
                    )}
                </div>

                {/* Stato attesa */}
                {isInAttesa && (
                    <span
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '100px',
                            background: 'rgba(234,179,8,0.15)',
                            color: '#d97706',
                            border: '1px solid rgba(234,179,8,0.3)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                        }}
                    >
                        <AlertTriangle size={10} /> ATTESA
                    </span>
                )}
            </div>

            {/* Toggle controls */}
            <div
                style={{
                    display: 'flex',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                    paddingLeft: '2.5rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                }}
            >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={isInAttesa}
                        onChange={(e) => onSetAttesa(e.target.checked)}
                        style={{ width: 14, height: 14 }}
                    />
                    In Attesa
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={r.lavorato || false}
                        onChange={(e) => onSetLavorato(e.target.checked)}
                        style={{ width: 14, height: 14 }}
                    />
                    <CheckSquare size={12} /> Lavorato
                </label>
            </div>

            {/* Note */}
            <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onBlur={() => onSetNota(nota)}
                placeholder="Note..."
                rows={2}
                style={{
                    marginLeft: '2.5rem',
                    width: 'calc(100% - 2.5rem)',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--border-radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    resize: 'none',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                }}
            />

            {/* Azioni */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                    paddingTop: '0.25rem',
                    borderTop: '1px solid var(--border-subtle)',
                }}
            >
                {tabView === 'nuovo' ? (
                    <button
                        className="btn btn-primary"
                        onClick={onArchivia}
                        disabled={!canArchivia}
                        title={isInAttesa ? 'Non archiviabile in stato ATTESA' : 'Archivia rapportino'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.85rem',
                            opacity: canArchivia ? 1 : 0.45,
                            cursor: canArchivia ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <Archive size={14} /> ARCHIVIA
                    </button>
                ) : (
                    <button
                        className="btn"
                        onClick={onRipristina}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    >
                        <RotateCcw size={14} /> RIPRISTINA
                    </button>
                )}
                <button
                    onClick={() => {
                        if (window.confirm('Eliminare DEFINITIVAMENTE questo rapportino e la foto dal server?')) {
                            onElimina();
                        }
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.75rem',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'transparent',
                        color: 'var(--danger-color)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        transition: 'background 0.2s',
                    }}
                    title="Elimina rapportino e foto"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
