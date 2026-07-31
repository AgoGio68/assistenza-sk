import React, { useState, useEffect } from 'react';
import { UnitaSk } from '../types';
import { UnitaSkService } from '../services/UnitaSkService';
import { X, Search, Monitor, RefreshCw } from 'lucide-react';

interface UnitaSkPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (unit: UnitaSk) => void;
}

export const UnitaSkPicker: React.FC<UnitaSkPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
}) => {
    const [units, setUnits] = useState<UnitaSk[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            const loadUnits = async () => {
                setLoading(true);
                try {
                    const data = await UnitaSkService.fetchUnits();
                    setUnits(data);
                } catch (error) {
                    console.error('Error fetching units:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadUnits();
            setSearch('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredUnits = units.filter(
        (u) =>
            (u.modello || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.seriale || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="unita-sk-picker-overlay" onClick={onClose}>
            <style>{`
                .unita-sk-picker-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    z-index: 2500;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    animation: fadeIn 0.2s ease-out;
                }
                .unita-sk-picker-container {
                    background: var(--bg-surface, #1e293b);
                    width: 100%;
                    max-width: 600px;
                    height: 80vh;
                    max-height: 800px;
                    border-radius: 24px 24px 0 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.3), 0 -8px 10px -6px rgba(0, 0, 0, 0.3);
                    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .unita-sk-picker-drag-handle {
                    width: 40px;
                    height: 5px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                    margin: 10px auto 4px auto;
                    flex-shrink: 0;
                }
                .unita-sk-picker-header {
                    padding: 0.5rem 1.5rem 1rem 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
                    flex-shrink: 0;
                }
                .unita-sk-picker-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--text-primary, #f8fafc);
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .unita-sk-picker-close {
                    background: rgba(255, 255, 255, 0.05);
                    border: none;
                    color: var(--text-secondary, #94a3b8);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s, color 0.2s;
                }
                .unita-sk-picker-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary, #f8fafc);
                }
                .unita-sk-picker-search-wrapper {
                    position: sticky;
                    top: 0;
                    background: var(--bg-surface, #1e293b);
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
                    z-index: 10;
                    flex-shrink: 0;
                }
                .unita-sk-picker-search-container {
                    position: relative;
                }
                .unita-sk-picker-search-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-secondary, #94a3b8);
                    pointer-events: none;
                }
                .unita-sk-picker-search-input {
                    width: 100%;
                    padding: 0.85rem 1rem 0.85rem 2.75rem;
                    border-radius: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
                    color: var(--text-primary, #f8fafc);
                    font-size: 1rem;
                    transition: border-color 0.2s, background-color 0.2s;
                    box-sizing: border-box;
                }
                .unita-sk-picker-search-input:focus {
                    outline: none;
                    border-color: #ef4444;
                    background: rgba(255, 255, 255, 0.05);
                }
                .unita-sk-picker-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    -webkit-overflow-scrolling: touch;
                }
                .unita-sk-unit-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
                    border-radius: 18px;
                    padding: 1.25rem;
                    text-align: left;
                    cursor: pointer;
                    transition: transform 0.2s, border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
                    width: 100%;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    outline: none;
                }
                .unita-sk-unit-card:hover, .unita-sk-unit-card:focus {
                    transform: translateY(-2px);
                    background: rgba(239, 68, 68, 0.03);
                    border-color: rgba(239, 68, 68, 0.3);
                    box-shadow: 0 4px 20px -2px rgba(239, 68, 68, 0.1);
                }
                .unita-sk-unit-card:active {
                    transform: translateY(0) scale(0.98);
                }
                .unita-sk-unit-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 0.75rem;
                }
                .unita-sk-unit-model {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: var(--text-primary, #f8fafc);
                }
                .unita-sk-unit-serial-label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-secondary, #94a3b8);
                    letter-spacing: 0.05em;
                }
                .unita-sk-unit-serial {
                    font-size: 1rem;
                    font-weight: 700;
                    font-family: monospace;
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                }
                .unita-sk-unit-note {
                    font-size: 0.85rem;
                    color: var(--text-secondary, #94a3b8);
                    font-style: italic;
                    margin-top: 0.25rem;
                }
                .unita-sk-status-badge {
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 0.2rem 0.5rem;
                    border-radius: 99px;
                    display: inline-flex;
                    align-items: center;
                    width: fit-content;
                }
                .unita-sk-status-badge.available {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                .unita-sk-status-badge.assigned {
                    background: rgba(148, 163, 184, 0.1);
                    color: #94a3b8;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }
                .unita-sk-unit-card.disabled {
                    cursor: not-allowed;
                    opacity: 0.6;
                    background: rgba(255, 255, 255, 0.01);
                }
                .unita-sk-unit-card.disabled:hover, .unita-sk-unit-card.disabled:focus {
                    transform: none;
                    background: rgba(255, 255, 255, 0.01);
                    border-color: var(--border-subtle, rgba(255, 255, 255, 0.05));
                    box-shadow: none;
                }
                .unita-sk-picker-empty {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--text-secondary, #94a3b8);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }
                .unita-sk-picker-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 1rem;
                    color: var(--text-secondary, #94a3b8);
                    gap: 1rem;
                }
                .unita-sk-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (min-width: 640px) {
                    .unita-sk-picker-overlay {
                        align-items: center;
                        padding: 2rem;
                    }
                    .unita-sk-picker-container {
                        border-radius: 24px;
                        height: 70vh;
                        max-height: 650px;
                        animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .unita-sk-picker-drag-handle {
                        display: none;
                    }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <div
                className="unita-sk-picker-container"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="unita-sk-picker-drag-handle" />
                
                <div className="unita-sk-picker-header">
                    <h3 className="unita-sk-picker-title">
                        <Monitor size={22} style={{ color: '#ef4444' }} />
                        Associa Unità SK
                    </h3>
                    <button className="unita-sk-picker-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="unita-sk-picker-search-wrapper">
                    <div className="unita-sk-picker-search-container">
                        <Search className="unita-sk-picker-search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Cerca per modello o seriale..."
                            className="unita-sk-picker-search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="unita-sk-picker-list">
                    {loading ? (
                        <div className="unita-sk-picker-loader">
                            <RefreshCw className="unita-sk-spin" size={32} style={{ color: '#ef4444' }} />
                            <span>Caricamento unità disponibili...</span>
                        </div>
                    ) : filteredUnits.length > 0 ? (
                        filteredUnits.map((unit) => {
                            const isAssigned = !!unit.assignedToInstallationId;
                            return (
                                <button
                                    key={unit.id}
                                    className={`unita-sk-unit-card ${isAssigned ? 'disabled' : ''}`}
                                    onClick={() => !isAssigned && onSelect(unit)}
                                    disabled={isAssigned}
                                >
                                    <div className="unita-sk-unit-header">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <span className="unita-sk-unit-model">{unit.modello}</span>
                                            {isAssigned ? (
                                                <span className="unita-sk-status-badge assigned">
                                                    Assegnata a: {unit.assignedToClientName || 'N/D'}
                                                </span>
                                            ) : (
                                                <span className="unita-sk-status-badge available">
                                                    Disponibile
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                            <span className="unita-sk-unit-serial-label">S/N</span>
                                            <span className="unita-sk-unit-serial">{unit.seriale}</span>
                                        </div>
                                    </div>
                                {unit.note && (
                                    <div className="unita-sk-unit-note">
                                        Note: {unit.note}
                                    </div>
                                )}
                            </button>
                            );
                        })
                    ) : (
                        <div className="unita-sk-picker-empty">
                            <Monitor size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
                            <span>Nessuna unità SK corrisponde alla ricerca.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
