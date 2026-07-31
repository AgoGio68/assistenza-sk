import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnitaSkService } from '../../services/UnitaSkService';
import { AuditLogService } from '../../services/AuditLogService';
import { UnitaSk } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
    Plus,
    Trash2,
    Edit2,
    Search,
    AlertTriangle,
    X,
    Archive,
    Eye,
    EyeOff,
    ExternalLink,
} from 'lucide-react';

export const UnitaSkTab: React.FC = () => {
    const { currentUser, isSuperadmin, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [units, setUnits] = useState<UnitaSk[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    // State per Nuovo/Modifica Unità
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitaSk | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [newUnit, setNewUnit] = useState({
        modello: '',
        seriale: '',
        note: '',
    });

    useEffect(() => {
        loadUnits();
    }, [showArchived]);

    const loadUnits = async () => {
        setLoading(true);
        try {
            const fetched = showArchived
                ? await UnitaSkService.fetchAllUnits()
                : await UnitaSkService.fetchUnits();
            setUnits(fetched);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        try {
            await UnitaSkService.addUnit({
                modello: newUnit.modello,
                seriale: newUnit.seriale,
                note: newUnit.note || null,
            });

            // Log di audit
            if (currentUser) {
                const authorName = currentUser.displayName || 'Amministratore';
                await AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : 'admin',
                    action: 'CREATE',
                    resourceType: 'UNITA_SK',
                    details: `${authorName} ha CREATO la nuova Unità SK Modello: ${newUnit.modello}, Serial: ${newUnit.seriale}`,
                });
            }

            setIsAddModalOpen(false);
            setNewUnit({ modello: '', seriale: '', note: '' });
            loadUnits();
        } catch (error: any) {
            setErrorMsg(error.message || "Errore durante il salvataggio.");
        }
    };

    const handleUpdateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUnit?.id) return;
        setErrorMsg(null);
        try {
            await UnitaSkService.updateUnit(editingUnit.id, {
                modello: editingUnit.modello,
                seriale: editingUnit.seriale,
                note: editingUnit.note || null,
            });

            // Log di audit
            if (currentUser) {
                const authorName = currentUser.displayName || 'Amministratore';
                await AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : 'admin',
                    action: 'UPDATE',
                    resourceType: 'UNITA_SK',
                    resourceId: editingUnit.id,
                    details: `${authorName} ha MODIFICATO l'Unità SK ID: ${editingUnit.id}. Nuovo modello: ${editingUnit.modello}, Serial: ${editingUnit.seriale}`,
                });
            }

            setEditingUnit(null);
            loadUnits();
        } catch (error: any) {
            setErrorMsg(error.message || "Errore durante l'aggiornamento.");
        }
    };

    const handleDeleteUnit = async (id: string, model: string, serial: string) => {
        if (!window.confirm(`Sei sicuro di voler ELIMINARE DEFINITIVAMENTE l'unità SK modello "${model}" con seriale "${serial}"?`)) {
            return;
        }
        try {
            await UnitaSkService.deleteUnit(id);

            // Log di audit
            if (currentUser) {
                const authorName = currentUser.displayName || 'Amministratore';
                await AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : 'admin',
                    action: 'DELETE',
                    resourceType: 'UNITA_SK',
                    resourceId: id,
                    details: `${authorName} ha ELIMINATO DEFINITIVAMENTE l'Unità SK Modello: ${model}, Serial: ${serial}`,
                });
            }

            loadUnits();
        } catch (error) {
            alert("Errore durante l'eliminazione.");
        }
    };

    const filteredUnits = units.filter(
        (u) =>
            u.modello.toLowerCase().includes(search.toLowerCase()) ||
            u.seriale.toLowerCase().includes(search.toLowerCase()) ||
            (u.note || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.assignedToClientName || '').toLowerCase().includes(search.toLowerCase())
    );

    const archivedCount = units.filter((u) => u.isArchived).length;

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento unità SK...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Stili inline per status badge */}
            <style>{`
                .sk-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    padding: 0.25rem 0.65rem;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    white-space: nowrap;
                }
                .sk-status-badge.available {
                    background: rgba(16, 185, 129, 0.12);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.25);
                }
                .sk-status-badge.assigned {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.25);
                }
                .sk-status-badge.archived {
                    background: rgba(148, 163, 184, 0.1);
                    color: #94a3b8;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }
                .sk-client-link {
                    background: none;
                    border: none;
                    padding: 0;
                    margin: 0;
                    color: #f59e0b;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.75rem;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.2rem;
                }
                .sk-client-link:hover { color: #fbbf24; }
                .sk-serial-cell {
                    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #ef4444;
                    letter-spacing: 0.03em;
                }
                .sk-archived-row {
                    opacity: 0.5;
                }
                .sk-toggle-archive-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    border: 1px solid var(--border-subtle);
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 0.82rem;
                    font-weight: 600;
                    transition: background 0.2s, color 0.2s, border-color 0.2s;
                }
                .sk-toggle-archive-btn:hover {
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary);
                }
                .sk-toggle-archive-btn.active {
                    background: rgba(148, 163, 184, 0.12);
                    color: #94a3b8;
                    border-color: rgba(148, 163, 184, 0.3);
                }
            `}</style>

            {/* Header & Ricerca */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Gestione Unità SK</h3>
                    {archivedCount > 0 && (
                        <button
                            className={`sk-toggle-archive-btn ${showArchived ? 'active' : ''}`}
                            onClick={() => setShowArchived((v) => !v)}
                            title={showArchived ? 'Nascondi unità archiviate' : 'Mostra unità archiviate (collaudate)'}
                        >
                            {showArchived ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showArchived ? 'Nascondi Archiviate' : `Mostra Archiviate (${archivedCount})`}
                        </button>
                    )}
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
                            placeholder="Cerca per modello, seriale o cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem 0.6rem 2.2rem',
                                borderRadius: 99,
                                width: 280,
                                fontSize: '0.85rem',
                            }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setErrorMsg(null);
                            setIsAddModalOpen(true);
                        }}
                        style={{ gap: '0.5rem' }}
                    >
                        <Plus size={18} /> Nuova Unità SK
                    </button>
                    {(isSuperadmin || isAdmin) && (
                        <button
                            className="btn btn-secondary"
                            onClick={async () => {
                                if (window.confirm("Vuoi eseguire la migrazione dei vecchi record SK?")) {
                                    const { migrateLegacyUnits } = await import('../../utils/migrateLegacyUnits');
                                    await migrateLegacyUnits();
                                    loadUnits();
                                }
                            }}
                            style={{ gap: '0.5rem', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                            title="Migra Dati Legacy (isArchived: false)"
                        >
                            <AlertTriangle size={18} color="#f59e0b" /> Migra Dati
                        </button>
                    )}
                </div>
            </div>

            {/* Tabella Unità SK */}
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
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Modello</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Numero di Serie</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Stato</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Note</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Creato il</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Ultima Modifica</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUnits.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    Nessuna unità SK trovata.
                                </td>
                            </tr>
                        ) : (
                            filteredUnits.map((unit) => {
                                const isAssigned = !!unit.assignedToInstallationId;
                                const isArchived = unit.isArchived === true;

                                return (
                                    <tr
                                        key={unit.id}
                                        className={isArchived ? 'sk-archived-row' : ''}
                                        style={{
                                            background: isArchived
                                                ? 'rgba(148, 163, 184, 0.03)'
                                                : 'var(--bg-elevated)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 12,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {/* Modello */}
                                        <td
                                            style={{
                                                padding: '1rem',
                                                borderTopLeftRadius: 12,
                                                borderBottomLeftRadius: 12,
                                                fontWeight: 800,
                                                fontSize: '0.95rem',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {isArchived && (
                                                    <Archive size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                )}
                                                {unit.modello}
                                            </div>
                                        </td>

                                        {/* Seriale — grande e prominente */}
                                        <td style={{ padding: '1rem' }}>
                                            <span className="sk-serial-cell">{unit.seriale}</span>
                                        </td>

                                        {/* Stato */}
                                        <td style={{ padding: '1rem' }}>
                                            {isArchived ? (
                                                <span className="sk-status-badge archived">
                                                    🏁 Collaudata
                                                </span>
                                            ) : isAssigned ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <span className="sk-status-badge assigned">🔗 Assegnata</span>
                                                    {unit.assignedToClientName && (
                                                        <button
                                                            className="sk-client-link"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/installazioni?search=${encodeURIComponent(unit.assignedToClientName || '')}`
                                                                )
                                                            }
                                                            title="Vai all'installazione"
                                                        >
                                                            {unit.assignedToClientName}
                                                            <ExternalLink size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="sk-status-badge available">✓ Disponibile</span>
                                            )}
                                        </td>

                                        {/* Note */}
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {unit.note || '—'}
                                        </td>

                                        {/* Creato il */}
                                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(unit.createdAt).toLocaleDateString()} {new Date(unit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>

                                        {/* Ultima modifica */}
                                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(unit.updatedAt).toLocaleDateString()} {new Date(unit.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>

                                        {/* Azioni */}
                                        <td
                                            style={{
                                                padding: '1rem',
                                                textAlign: 'right',
                                                borderTopRightRadius: 12,
                                                borderBottomRightRadius: 12,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                                <button
                                                    onClick={() => {
                                                        setErrorMsg(null);
                                                        setEditingUnit(unit);
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                    }}
                                                    title="Modifica"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUnit(unit.id!, unit.modello, unit.seriale)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--danger-color)',
                                                        cursor: 'pointer',
                                                        opacity: 0.8,
                                                    }}
                                                    title="Elimina"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Aggiungi Unità SK */}
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
                            <h3 style={{ margin: 0 }}>Nuova Unità SK</h3>
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
                            onSubmit={handleCreateUnit}
                            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        >
                            {errorMsg && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid var(--danger-color)',
                                    color: 'var(--danger-color)',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.85rem'
                                }}>
                                    <AlertTriangle size={16} />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Modello *
                                </label>
                                <input
                                    type="text"
                                    value={newUnit.modello}
                                    onChange={(e) => setNewUnit({ ...newUnit, modello: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                                    required
                                    placeholder="Es. SK-200"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Numero di Serie (Seriale) *
                                </label>
                                <input
                                    type="text"
                                    value={newUnit.seriale}
                                    onChange={(e) => setNewUnit({ ...newUnit, seriale: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                                    required
                                    placeholder="Es. SN-987654"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Note
                                </label>
                                <textarea
                                    value={newUnit.note}
                                    onChange={(e) => setNewUnit({ ...newUnit, note: e.target.value })}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', resize: 'vertical' }}
                                    placeholder="Note o dettagli aggiuntivi..."
                                />
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                                    Salva Unità SK
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Modifica Unità SK */}
            {editingUnit && (
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
                            <h3 style={{ margin: 0 }}>Modifica Unità SK</h3>
                            <button
                                onClick={() => setEditingUnit(null)}
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
                            onSubmit={handleUpdateUnit}
                            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        >
                            {errorMsg && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid var(--danger-color)',
                                    color: 'var(--danger-color)',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.85rem'
                                }}>
                                    <AlertTriangle size={16} />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Modello *
                                </label>
                                <input
                                    type="text"
                                    value={editingUnit.modello}
                                    onChange={(e) => setEditingUnit({ ...editingUnit, modello: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Numero di Serie (Seriale) *
                                </label>
                                <input
                                    type="text"
                                    value={editingUnit.seriale}
                                    onChange={(e) => setEditingUnit({ ...editingUnit, seriale: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Note
                                </label>
                                <textarea
                                    value={editingUnit.note || ''}
                                    onChange={(e) => setEditingUnit({ ...editingUnit, note: e.target.value })}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                                    Salva Modifiche
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
