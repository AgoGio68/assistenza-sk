import React, { useState, useEffect } from 'react';
import { InventoryService } from '../services/InventoryService';
import { InventoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { X, Search, Package, Minus, Plus, Check, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { AuditLogService } from '../services/AuditLogService';

interface InventoryUsageModalProps {
    isOpen: boolean;
    onClose: () => void;
    referenceId: string;
    referenceType: 'ticket' | 'installation';
    referenceName: string;
}

export const InventoryUsageModal: React.FC<InventoryUsageModalProps> = ({
    isOpen,
    onClose,
    referenceId,
    referenceType,
    referenceName,
}) => {
    const { currentUser, isSuperadmin, isAdmin, userProfile } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadItems();
            setSelectedItem(null);
            setQuantity(1);
            setNotes('');
        }
    }, [isOpen]);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await InventoryService.fetchItems();
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedItem?.id || !currentUser || saving) return;

        setSaving(true);
        try {
            await InventoryService.recordMovement({
                itemId: selectedItem.id,
                itemName: selectedItem.name,
                type: 'out',
                quantity: quantity,
                userId: currentUser.uid,
                userName: userProfile?.displayName || currentUser.displayName || 'Tecnico',
                referenceId: referenceId,
                referenceType: referenceType,
                notes: notes || `Scarico per ${referenceType}: ${referenceName}`,
            });

            // GAGOS 2026-04-02: Added Global Audit Log
            const authorName = userProfile?.displayName || currentUser.displayName || 'Utente';
            AuditLogService.logAction({
                userId: currentUser.uid,
                userEmail: currentUser.email || '',
                userName: authorName,
                userRole: isSuperadmin ? 'superadmin' : (isAdmin ? 'admin' : 'user'),
                action: 'UPDATE',
                resourceType: 'INVENTORY_ITEM',
                resourceId: selectedItem.id,
                details: `${authorName} ha PRELEVATO ${quantity} ${selectedItem.unit || 'pz'} di "${selectedItem.name}" per l'intervento di: ${referenceName}.`,
                metadata: { referenceId, referenceType, quantity, itemName: selectedItem.name }
            });

            onClose();
        } catch (error) {
            alert('Errore durante lo scarico del materiale.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    if (!isSuperadmin) {
        return (
            <div
                className="modal-overlay"
                style={{
                    zIndex: 2000,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        maxWidth: 400,
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 24,
                    }}
                >
                    <AlertCircle size={48} color="var(--danger-color)" style={{ marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto' }} />
                    <h3 style={{ marginBottom: '1rem' }}>Accesso Negato</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Solo i Superadmin sono autorizzati a prelevare materiali dal magazzino.
                    </p>
                    <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
                        Chiudi
                    </button>
                </div>
            </div>
        );
    }

    const filteredItems = items.filter(
        (it) =>
            it.name.toLowerCase().includes(search.toLowerCase()) ||
            it.code.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div
            className="modal-overlay"
            style={{
                zIndex: 2000,
                background: 'rgba(0,0,0,0.9)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: '5vh', // Posizionato in alto, centrato
            }}
        >
            <div
                className="modal-content"
                style={{
                    width: '100%',
                    maxWidth: 600,
                    maxHeight: '90vh',
                    borderRadius: '24px',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        background: 'var(--bg-elevated)',
                    }}
                >
                    {selectedItem ? (
                        <button
                            onClick={() => setSelectedItem(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                padding: '0.4rem',
                            }}
                        >
                            <ArrowLeft size={22} />
                        </button>
                    ) : (
                        <div
                            style={{
                                background: 'var(--primary-color)',
                                color: 'white',
                                padding: '0.5rem',
                                borderRadius: 10,
                                display: 'flex',
                            }}
                        >
                            <Package size={20} />
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                            {selectedItem ? 'Configura Scarico' : 'Scarico Materiale'}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            Assoc:{' '}
                            <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{referenceName}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'var(--text-muted)',
                            padding: '0.5rem',
                            borderRadius: '50%',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {!selectedItem ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: 16,
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
                                        width: '100%',
                                        padding: '0.85rem 1rem 0.85rem 3rem',
                                        borderRadius: 16,
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-subtle)',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    Cercando articoli...
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {filteredItems.map((it) => (
                                        <button
                                            key={it.id}
                                            onClick={() => setSelectedItem(it)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '1rem',
                                                borderRadius: 16,
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-subtle)',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                opacity: it.stock <= 0 ? 0.6 : 1,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 12,
                                                    background:
                                                        it.stock <= 0
                                                            ? 'rgba(239, 68, 68, 0.1)'
                                                            : 'rgba(16,185,129,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color:
                                                        it.stock <= 0 ? 'var(--danger-color)' : 'var(--primary-color)',
                                                    fontWeight: 800,
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                {it.stock}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {it.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {it.code}
                                                </div>
                                            </div>
                                            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <div
                                            style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                                        >
                                            Nessun articolo trovato.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div
                                style={{
                                    padding: '1.25rem',
                                    borderRadius: 20,
                                    background: 'linear-gradient(135deg, var(--bg-hover) 0%, transparent 100%)',
                                    border: '1px solid var(--border-subtle)',
                                    textAlign: 'center',
                                }}
                            >
                                <div
                                    style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}
                                >
                                    Hai selezionato:
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                    {selectedItem.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--primary-color)',
                                        fontWeight: 700,
                                        marginTop: '0.4rem',
                                    }}
                                >
                                    Disponibili: {selectedItem.stock} {selectedItem.unit || 'pz'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Quantità da scaricare
                                </label>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem',
                                        justifyContent: 'center',
                                        padding: '0.5rem 0',
                                    }}
                                >
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 20,
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Minus size={24} />
                                    </button>
                                    <div
                                        style={{ fontSize: '3rem', fontWeight: 900, minWidth: 80, textAlign: 'center' }}
                                    >
                                        {quantity}
                                    </div>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 20,
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>
                                {quantity > selectedItem.stock && (
                                    <div
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 12,
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: 'var(--danger-color)',
                                            fontSize: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <AlertCircle size={16} />
                                        Attenzione: la quantità supera la giacenza attuale.
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Note (facoltative)
                                </label>
                                <textarea
                                    placeholder="Es: Sostituzione motore, guasto..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: 16,
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-subtle)',
                                        fontSize: '1rem',
                                        minHeight: 80,
                                        resize: 'none',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                {selectedItem && (
                    <div
                        style={{
                            padding: '1.5rem',
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-elevated)',
                        }}
                    >
                        <button
                            disabled={saving}
                            onClick={handleConfirm}
                            style={{
                                width: '100%',
                                padding: '1.1rem',
                                borderRadius: 16,
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                                opacity: saving ? 0.6 : 1,
                            }}
                        >
                            {saving ? (
                                'Registrazione...'
                            ) : (
                                <>
                                    <Check size={22} /> Conferma Scarico
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
