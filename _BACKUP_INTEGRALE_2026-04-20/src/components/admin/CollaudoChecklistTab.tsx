import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Save, ClipboardList, AlertCircle, Edit2 } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

interface CollaudoChecklistTabProps {
    onUnsavedChange?: (hasUnsaved: boolean) => void;
}

type ChecklistKey = 'rp' | 'sp' | 'c1' | 'c2' | 'c3' | 'c4';

export const CollaudoChecklistTab: React.FC<CollaudoChecklistTabProps> = ({ onUnsavedChange }) => {
    const { settings, updateSettings, loading: settingsLoading } = useSettings();

    // ─── Stato dinamico per le liste ──────────────────────────────
    const [lists, setLists] = useState<Record<ChecklistKey, string[]>>({
        rp: [],
        sp: [],
        c1: [],
        c2: [],
        c3: [],
        c4: [],
    });

    const [titles, setTitles] = useState<Record<string, string>>({
        c1: 'Custom 1',
        c2: 'Custom 2',
        c3: 'Custom 3',
        c4: 'Custom 4',
    });

    // Flag per evitare ricaricamenti continui se l'utente sta modificando
    const [isInitialized, setIsInitialized] = useState(false);

    // v4.0.1: Sincronizzazione iniziale Robusta
    useEffect(() => {
        if (!settingsLoading && !isInitialized && settings.collaudoChecklists) {
            setLists({
                rp: settings.collaudoChecklists?.rp || [],
                sp: settings.collaudoChecklists?.sp || [],
                c1: Array.isArray(settings.collaudoChecklists?.c1) ? settings.collaudoChecklists?.c1 : (settings.collaudoChecklists?.c1?.items || []),
                c2: Array.isArray(settings.collaudoChecklists?.c2) ? settings.collaudoChecklists?.c2 : (settings.collaudoChecklists?.c2?.items || []),
                c3: Array.isArray(settings.collaudoChecklists?.c3) ? settings.collaudoChecklists?.c3 : (settings.collaudoChecklists?.c3?.items || []),
                c4: Array.isArray(settings.collaudoChecklists?.c4) ? settings.collaudoChecklists?.c4 : (settings.collaudoChecklists?.c4?.items || []),
            });
            setTitles({
                c1: (settings.collaudoChecklists?.c1 as any)?.title || 'Custom 1',
                c2: (settings.collaudoChecklists?.c2 as any)?.title || 'Custom 2',
                c3: (settings.collaudoChecklists?.c3 as any)?.title || 'Custom 3',
                c4: (settings.collaudoChecklists?.c4 as any)?.title || 'Custom 4',
            });
            setIsInitialized(true);
        }
    }, [settingsLoading, settings.collaudoChecklists, isInitialized]);

    const [newInputs, setNewInputs] = useState<Record<ChecklistKey, string>>({
        rp: '',
        sp: '',
        c1: '',
        c2: '',
        c3: '',
        c4: '',
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // ─── Drag and Drop State ──────────────────────────────────────────────
    const [draggedItem, setDraggedItem] = useState<{ key: ChecklistKey; idx: number } | null>(null);
    const [dragOverItem, setDragOverItem] = useState<{ key: ChecklistKey; idx: number } | null>(null);

    // ─── Rileva modifiche ─────────────────────────────────────────
    const getCurrentData = () => ({
        rp: lists.rp,
        sp: lists.sp,
        c1: { title: titles.c1, items: lists.c1 },
        c2: { title: titles.c2, items: lists.c2 },
        c3: { title: titles.c3, items: lists.c3 },
        c4: { title: titles.c4, items: lists.c4 },
    });

    const hasUnsavedChanges =
        !saved && JSON.stringify(getCurrentData()) !== JSON.stringify(settings.collaudoChecklists || {});

    useEffect(() => {
        if (onUnsavedChange) {
            onUnsavedChange(hasUnsavedChanges);
        }
    }, [hasUnsavedChanges, onUnsavedChange]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // ─── Gestione liste ───────────────────────────────────────────
    const addItem = (key: ChecklistKey) => {
        const val = newInputs[key].trim();
        if (!val) return;
        setLists((prev) => ({ ...prev, [key]: [...prev[key], val] }));
        setNewInputs((prev) => ({ ...prev, [key]: '' }));
        setSaved(false);
    };

    const removeItem = (key: ChecklistKey, idx: number) => {
        setLists((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
        setSaved(false);
    };

    const updateItem = (key: ChecklistKey, idx: number, val: string) => {
        setLists((prev) => ({ ...prev, [key]: prev[key].map((it, i) => (i === idx ? val : it)) }));
        setSaved(false);
    };

    const updateTitle = (key: string, val: string) => {
        setTitles((prev) => ({ ...prev, [key]: val }));
        setSaved(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: ChecklistKey) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem(key);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSettings({
                collaudoChecklists: getCurrentData(),
            });
            setSaved(true);
        } catch (err) {
            alert('Errore durante il salvataggio. Riprova.');
        }
        setSaving(false);
    };

    // ─── Drag and Drop Handlers ───────────────────────────────────────────
    const handleDrop = (targetKey: ChecklistKey) => {
        if (!draggedItem || draggedItem.key !== targetKey || !dragOverItem) return;
        const fromIdx = draggedItem.idx;
        const toIdx = dragOverItem.idx;
        if (fromIdx === toIdx) return;

        setLists((prev) => {
            const newList = [...prev[targetKey]];
            const [movedItem] = newList.splice(fromIdx, 1);
            newList.splice(toIdx, 0, movedItem);
            return { ...prev, [targetKey]: newList };
        });
        setSaved(false);
        setDraggedItem(null);
        setDragOverItem(null);
    };

    // ─── Render singola lista ─────────────────────────────────────
    const renderList = (key: ChecklistKey, accentColor: string, defaultLabel: string, isCustom: boolean = false) => {
        const items = lists[key];
        const title = isCustom ? titles[key] : defaultLabel;

        return (
            <div
                style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--border-radius-lg)',
                    overflow: 'hidden',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header sezione */}
                <div
                    style={{
                        padding: '0.9rem 1.25rem',
                        background: `linear-gradient(135deg, ${accentColor}14 0%, transparent 100%)`,
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                    }}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            background: accentColor + '22',
                            color: accentColor,
                            borderRadius: '50%',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            flexShrink: 0,
                        }}
                    >
                        {isCustom ? key.toUpperCase() : defaultLabel}
                    </span>
                    <div style={{ flex: 1 }}>
                        {isCustom ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => updateTitle(key, e.target.value)}
                                    placeholder="Nome tabella..."
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px dashed var(--border-subtle)',
                                        fontWeight: 800,
                                        fontSize: '0.95rem',
                                        color: 'var(--text-primary)',
                                        padding: '0.1rem 0',
                                        width: '100%',
                                        outline: 'none',
                                    }}
                                />
                                <Edit2 size={12} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                            </div>
                        ) : (
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                Macchine {defaultLabel}
                            </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {items.length} {items.length === 1 ? 'controllo' : 'controlli'}
                        </div>
                    </div>
                </div>

                {/* Lista voci */}
                <div
                    style={{
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        maxHeight: 600,
                        overflowY: 'auto',
                        minHeight: 120,
                        background: 'rgba(0,0,0,0.1)',
                    }}
                >
                    {items.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '2rem 0',
                                color: 'var(--text-muted)',
                                fontSize: '0.8rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.6rem',
                            }}
                        >
                            <AlertCircle size={20} style={{ opacity: 0.3 }} />
                            Nessun controllo definito.
                        </div>
                    ) : (
                        items.map((item, idx) => (
                            <div
                                key={idx}
                                draggable
                                onDragStart={() => setDraggedItem({ key, idx })}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOverItem({ key, idx });
                                }}
                                onDrop={() => handleDrop(key)}
                                onDragEnd={() => {
                                    setDraggedItem(null);
                                    setDragOverItem(null);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.4rem 0.5rem',
                                    background: draggedItem?.key === key && draggedItem?.idx === idx ? 'rgba(0,0,0,0.05)' : 'var(--bg-elevated)',
                                    border: '1px solid',
                                    borderColor: dragOverItem?.key === key && dragOverItem?.idx === idx && draggedItem?.idx !== idx 
                                        ? 'var(--primary-color)' 
                                        : 'var(--border-subtle)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    opacity: draggedItem?.key === key && draggedItem?.idx === idx ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <GripVertical
                                    size={14}
                                    style={{ color: 'var(--text-muted)', flexShrink: 0, cursor: 'grab' }}
                                />
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: 'var(--text-muted)',
                                        minWidth: 16,
                                        textAlign: 'center',
                                    }}
                                >
                                    {idx + 1}
                                </span>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => updateItem(key, idx, e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-primary)',
                                        padding: '0.1rem',
                                    }}
                                />
                                <button
                                    onClick={() => removeItem(key, idx)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--danger-color)',
                                        padding: '0.2rem',
                                        opacity: 0.4,
                                        transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Input aggiunta */}
                <div
                    style={{
                        padding: '0.75rem',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        gap: '0.5rem',
                        background: 'var(--bg-surface)',
                    }}
                >
                    <input
                        type="text"
                        value={newInputs[key]}
                        onChange={(e) => setNewInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => handleKeyDown(e, key)}
                        placeholder="Aggiungi..."
                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                    />
                    <button
                        onClick={() => addItem(key)}
                        disabled={!newInputs[key].trim()}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem', minWidth: 40, opacity: newInputs[key].trim() ? 1 : 0.4 }}
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                }}
            >
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                        }}
                    >
                        <ClipboardList size={22} style={{ color: 'var(--primary-color)' }} />
                        Gestione Checklist Collaudo
                    </h3>
                    <p
                        style={{
                            margin: '0.35rem 0 0',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            maxWidth: '600px',
                        }}
                    >
                        Configura le 6 tabelle di controllo. RP e SP sono fisse per tipo macchina, le altre 4 sono
                        completamente personalizzabili per scopi futuri.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ gap: '0.5rem', minWidth: 160 }}
                >
                    <Save size={18} />
                    {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : 'Salva Tutte'}
                </button>
            </div>

            {/* Grid 2 colonne (50% width) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
                    gap: '1.25rem',
                }}
            >
                {renderList('rp', '#6366f1', 'RP')}
                {renderList('sp', '#14b8a6', 'SP')}
                {renderList('c1', '#f59e0b', 'Custom 1', true)}
                {renderList('c2', '#ec4899', 'Custom 2', true)}
                {renderList('c3', '#8b5cf6', 'Custom 3', true)}
                {renderList('c4', '#0ea5e9', 'Custom 4', true)}
            </div>

            {/* Footer info */}
            <div
                style={{
                    padding: '1rem 1.25rem',
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.1)',
                    borderRadius: 'var(--border-radius-lg)',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                }}
            >
                <AlertCircle size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Nota senior:</strong> Le tabelle RP e SP vengono attivate automaticamente in base al
                    prefisso della macchina. Le tabelle Custom 1-4 sono predisposte per future integrazioni manuali o
                    filtri avanzati.
                </p>
            </div>
        </div>
    );
};
