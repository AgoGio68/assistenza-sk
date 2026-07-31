import React, { useState, useEffect } from 'react';
import { InventoryService } from '../../services/InventoryService';
import { InventoryItem, InventoryMovement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
    Plus,
    Trash2,
    Edit2,
    Package,
    TrendingDown,
    TrendingUp,
    History,
    Search,
    AlertTriangle,
    Save,
    X,
    ArrowUpCircle,
    Calendar,
    User,
} from 'lucide-react';

export const InventoryTab: React.FC = () => {
    const { currentUser, isSuperadmin } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'items' | 'history'>('items');

    // Drag and Drop State
    const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
    const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);

    // State per Nuovo/Modifica Articolo
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '',
        code: '',
        stock: 0,
        minThreshold: 5,
        unit: 'pz',
        category: 'Generico',
        cost: 0,
        price: 0,
    });

    // State per Movimento Rapido (Carico)
    const [movementTarget, setMovementTarget] = useState<InventoryItem | null>(null);
    const [movementQty, setMovementQty] = useState(1);
    const [movementNote, setMovementNote] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedItems, fetchedMovements] = await Promise.all([
                InventoryService.fetchItems(),
                InventoryService.fetchMovements(30),
            ]);
            setItems(fetchedItems);
            setMovements(fetchedMovements);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await InventoryService.addItem(newItem as Omit<InventoryItem, 'id'>);
            setIsAddModalOpen(false);
            setNewItem({
                name: '',
                code: '',
                stock: 0,
                minThreshold: 5,
                unit: 'pz',
                category: 'Generico',
                cost: 0,
                price: 0,
            });
            loadData();
        } catch (error) {
            alert("Errore durante l'aggiunta dell'articolo.");
        }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem?.id) return;
        try {
            await InventoryService.updateItem(editingItem.id, editingItem);
            setEditingItem(null);
            loadData();
        } catch (error) {
            alert("Errore durante l'aggiornamento dell'articolo.");
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo articolo?')) return;
        try {
            await InventoryService.deleteItem(id);
            loadData();
        } catch (error) {
            alert("Errore durante l'eliminazione.");
        }
    };

    const handleQuickMovement = async () => {
        if (!movementTarget?.id || !currentUser) return;
        try {
            await InventoryService.recordMovement({
                itemId: movementTarget.id,
                itemName: movementTarget.name,
                type: 'in',
                quantity: movementQty,
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Admin',
                notes: movementNote || 'Carico manuale da pannello admin',
            });
            setMovementTarget(null);
            setMovementQty(1);
            setMovementNote('');
            loadData();
        } catch (error) {
            alert('Errore durante la registrazione del movimento.');
        }
    };

    const handleDrop = async (targetIdx: number) => {
        if (draggedItemIdx === null || draggedItemIdx === targetIdx || search) return;

        const newItems = [...items];
        const [movedItem] = newItems.splice(draggedItemIdx, 1);
        newItems.splice(targetIdx, 0, movedItem);

        setItems(newItems);
        setDraggedItemIdx(null);
        setDragOverItemIdx(null);

        try {
            await InventoryService.updateItemsOrder(newItems);
        } catch (error) {
            console.error('Order save error:', error);
        }
    };

    const filteredItems = items.filter(
        (it) =>
            it.name.toLowerCase().includes(search.toLowerCase()) ||
            it.code.toLowerCase().includes(search.toLowerCase()),
    );

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento magazzino...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header & Sub-Tabs */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '0.3rem',
                        borderRadius: 12,
                    }}
                >
                    <button
                        onClick={() => setActiveSubTab('items')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: activeSubTab === 'items' ? 'var(--primary-color)' : 'transparent',
                            color: activeSubTab === 'items' ? 'white' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                        }}
                    >
                        <Package size={16} /> Articoli
                    </button>
                    <button
                        onClick={() => setActiveSubTab('history')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: activeSubTab === 'history' ? 'var(--primary-color)' : 'transparent',
                            color: activeSubTab === 'history' ? 'white' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                        }}
                    >
                        <History size={16} /> Storico Movimenti
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search
                            size={16}
                            style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Cerca per nome o codice..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem 0.6rem 2.2rem',
                                borderRadius: 99,
                                width: 250,
                                fontSize: '0.85rem',
                            }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ gap: '0.5rem' }}
                    >
                        <Plus size={18} /> Nuovo Articolo
                    </button>
                </div>
            </div>

            {activeSubTab === 'items' ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                        <thead>
                            <tr
                                style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                    <th style={{ padding: '0.5rem 0.5rem', width: 30 }}></th>
                                    <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Codice / Articolo</th>
                                <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Giacenza</th>
                                <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Soglia</th>
                                <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Costo / Prezzo</th>
                                <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item, index) => {
                                const isLowStock = item.stock < item.minThreshold;
                                return (
                                    <tr
                                        key={item.id}
                                        draggable={!search}
                                        onDragStart={() => setDraggedItemIdx(index)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (!search) setDragOverItemIdx(index);
                                        }}
                                        onDrop={() => handleDrop(index)}
                                        onDragEnd={() => {
                                            setDraggedItemIdx(null);
                                            setDragOverItemIdx(null);
                                        }}
                                        style={{
                                            background: isLowStock ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-elevated)',
                                            border: isLowStock
                                                ? '1px solid rgba(239, 68, 68, 0.3)'
                                                : '1px solid var(--border-subtle)',
                                            borderRadius: 12,
                                            transition: 'all 0.2s',
                                            opacity: draggedItemIdx === index ? 0.4 : 1,
                                            transform: dragOverItemIdx === index && draggedItemIdx !== index ? 'translateY(2px)' : 'none',
                                            cursor: search ? 'default' : 'grab',
                                        }}
                                    >
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center', opacity: search ? 0.2 : 0.6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-subtle)', marginRight: '0.5rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor' }}></div>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '3px' }}>
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor' }}></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: '1rem',
                                                borderTopLeftRadius: 12,
                                                borderBottomLeftRadius: 12,
                                            }}
                                        >
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.name}</div>
                                            <div
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)',
                                                    fontFamily: 'monospace',
                                                }}
                                            >
                                                {item.code}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    color: isLowStock ? 'var(--danger-color)' : 'var(--text-primary)',
                                                    fontWeight: 900,
                                                    fontSize: '1.1rem',
                                                }}
                                            >
                                                {item.stock}{' '}
                                                <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                                    {item.unit || 'pz'}
                                                </span>
                                                {isLowStock && <AlertTriangle size={14} />}
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: '1rem',
                                                textAlign: 'center',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {item.minThreshold}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                €{item.price?.toFixed(2) || '0.00'}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                Costo: €{item.cost?.toFixed(2) || '0.00'}
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: '1rem',
                                                textAlign: 'right',
                                                borderTopRightRadius: 12,
                                                borderBottomRightRadius: 12,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => setMovementTarget(item)}
                                                    style={{
                                                        background: 'var(--bg-surface)',
                                                        border: '1px solid var(--border-subtle)',
                                                        color: 'var(--primary-color)',
                                                        padding: '0.4rem',
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                    }}
                                                    title="Carico Rapido"
                                                >
                                                    <ArrowUpCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingItem(item)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {isSuperadmin && (
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id!)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--danger-color)',
                                                            cursor: 'pointer',
                                                            opacity: 0.6,
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {movements.map((move) => (
                        <div
                            key={move.id}
                            style={{
                                background: 'var(--bg-elevated)',
                                padding: '1rem',
                                borderRadius: 12,
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                            }}
                        >
                            <div
                                style={{
                                    color: move.type === 'in' ? '#10b981' : '#f59e0b',
                                    background: move.type === 'in' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                    padding: '0.6rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                }}
                            >
                                {move.type === 'in' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <div style={{ fontWeight: 800 }}>{move.itemName}</div>
                                    <div
                                        style={{
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                        }}
                                    >
                                        <Calendar size={12} /> {new Date(move.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div
                                    style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}
                                >
                                    {move.type === 'in' ? 'Carico di' : 'Scarico di'} <b>{move.quantity}</b> pezzi
                                    {move.notes && (
                                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                            {' '}
                                            — {move.notes}
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.72rem',
                                        color: 'var(--text-muted)',
                                        marginTop: '0.3rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <User size={12} /> {move.userName}
                                    </span>
                                    {move.referenceId && (
                                        <span style={{ color: 'var(--primary-color)' }}>
                                            Assoc: {move.referenceType === 'ticket' ? 'Ticket' : 'Inst'} #
                                            {move.referenceId.substring(0, 8)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Aggiungi Articolo */}
            {isAddModalOpen && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
                    <div
                        className="modal-content"
                        style={{
                            maxWidth: 500,
                            padding: 0,
                            overflow: 'hidden',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                padding: '1.25rem',
                                borderBottom: '1px solid var(--border-subtle)',
                                background: 'linear-gradient(135deg, var(--bg-hover) 0%, transparent 100%)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Nuovo Articolo</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form
                            onSubmit={handleAddItem}
                            style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
                        >
                            <div style={{ gridColumn: 'span 2' }}>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Nome Articolo
                                </label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Codice
                                </label>
                                <input
                                    type="text"
                                    value={newItem.code}
                                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Unità (pz, mt...)
                                </label>
                                <input
                                    type="text"
                                    value={newItem.unit}
                                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Giacenza Iniziale
                                </label>
                                <input
                                    type="number"
                                    value={newItem.stock}
                                    onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) || 0 })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Soglia Alert
                                </label>
                                <input
                                    type="number"
                                    value={newItem.minThreshold}
                                    onChange={(e) =>
                                        setNewItem({ ...newItem, minThreshold: parseInt(e.target.value) || 0 })
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Costo Acquisto (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newItem.cost}
                                    onChange={(e) => setNewItem({ ...newItem, cost: parseFloat(e.target.value) || 0 })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Prezzo Vendita (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newItem.price}
                                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                                    Salva Articolo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Modifica Articolo */}
            {editingItem && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
                    <div
                        className="modal-content"
                        style={{
                            maxWidth: 500,
                            padding: 0,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                padding: '1.25rem',
                                borderBottom: '1px solid var(--border-subtle)',
                                background: 'linear-gradient(135deg, var(--bg-hover) 0%, transparent 100%)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Modifica Articolo</h3>
                            <button
                                onClick={() => setEditingItem(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form
                            onSubmit={handleUpdateItem}
                            style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
                        >
                            <div style={{ gridColumn: 'span 2' }}>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Nome Articolo
                                </label>
                                <input
                                    type="text"
                                    value={editingItem.name}
                                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Codice
                                </label>
                                <input
                                    type="text"
                                    value={editingItem.code}
                                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Unità
                                </label>
                                <input
                                    type="text"
                                    value={editingItem.unit}
                                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Soglia Alert
                                </label>
                                <input
                                    type="number"
                                    value={editingItem.minThreshold}
                                    onChange={(e) =>
                                        setEditingItem({ ...editingItem, minThreshold: parseInt(e.target.value) || 0 })
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Costo (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingItem.cost}
                                    onChange={(e) =>
                                        setEditingItem({ ...editingItem, cost: parseFloat(e.target.value) || 0 })
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Prezzo (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingItem.price}
                                    onChange={(e) =>
                                        setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                                    <Save size={18} /> Salva Modifiche
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Carico Rapido */}
            {movementTarget && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
                    <div
                        className="modal-content"
                        style={{
                            maxWidth: 400,
                            padding: 0,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                padding: '1.25rem',
                                borderBottom: '1px solid var(--border-subtle)',
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, transparent 100%)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h3 style={{ margin: 0, color: '#10b981' }}>Carico Merce</h3>
                            <button
                                onClick={() => setMovementTarget(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: 8,
                                }}
                            >
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Articolo</div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{movementTarget.name}</div>
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Quantità da Aggiungere
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <button
                                        onClick={() => setMovementQty(Math.max(1, movementQty - 1))}
                                        style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 14,
                                            border: 'none',
                                            background: '#10b98122',
                                            color: '#10b981',
                                            fontSize: '1.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        value={movementQty}
                                        onChange={(e) => setMovementQty(parseInt(e.target.value) || 0)}
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            fontSize: '1.8rem',
                                            fontWeight: 900,
                                            height: 50,
                                            background: 'var(--bg-deep)',
                                            border: '2px solid #10b98133',
                                            color: 'var(--text-primary)',
                                            borderRadius: 14,
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={() => setMovementQty(movementQty + 1)}
                                        style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 14,
                                            border: 'none',
                                            background: '#10b981',
                                            color: 'white',
                                            fontSize: '1.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Note (facoltative)
                                </label>
                                <input
                                    type="text"
                                    value={movementNote}
                                    onChange={(e) => setMovementNote(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                    }}
                                    placeholder="Es: DDT #123 del fornitore..."
                                />
                            </div>
                            <button
                                onClick={handleQuickMovement}
                                className="btn btn-primary w-full"
                                style={{ marginTop: '0.5rem', background: '#10b981' }}
                            >
                                Conferma Carico
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
