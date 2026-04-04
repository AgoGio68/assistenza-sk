import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

import { Installation } from '../types';
import {
    Truck,
    Calendar,
    Box,
    AlertTriangle,
    RefreshCw,
    X,
    Save,
    MessageSquare,
    Trash2,
    CheckCircle2,
    ListChecks,
    ArrowDownWideNarrow,
    MapPin,
    User,
    Link as LinkIcon,
    PlusCircle,
} from 'lucide-react';
import { InventoryUsageModal } from '../components/InventoryUsageModal';
import { InstallationCard } from '../components/InstallationCard';

import { useInstallations } from '../hooks/useInstallations';
import { useInstallationActions } from '../hooks/useInstallationActions';
interface InstallationsProps {
    section?: 'sk' | 's2';
}

export const Installations: React.FC<InstallationsProps> = ({ section = 'sk' }) => {
    const [usageModal, setUsageModal] = useState<{ isOpen: boolean; instId: string; clientName: string }>({
        isOpen: false,
        instId: '',
        clientName: '',
    });

    const { settings } = useSettings();
    const { isSuperadmin, isAdmin, googleToken, connectGoogle } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // UI Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortVerifiedAtBottom, setSortVerifiedAtBottom] = useState(true);

    const fieldConfig =
        section === 's2'
            ? (settings as any).section2InstallationsFields || {}
            : {
                  showModelSK: true,
                  showSerialSK: true,
                  showOrderNumber: true,
                  showOrderDfv: true,
                  showPlanning: true,
                  showModules: true,
                  showExtractedNotes: true,
                  showTechnicalNotes: true,
              };

    // --- custom hooks ---
    const {
        installations,
        orphanedData,
        loading,
        error,
        dbData,
        generateSemanticId,
        loadSheetData,
        handleHardResetDB,
    } = useInstallations(section, settings, isSuperadmin, googleToken);

    const {
        selectedInst,
        setSelectedInst,
        editData,
        setEditData,
        saving,
        exportToSheet,
        setExportToSheet,
        deleteConfirm,
        isSyncingCalendar,
        showOrphanVault,
        setShowOrphanVault,
        orphanToRelink,
        setOrphanToRelink,
        relinkTargetId,
        setRelinkTargetId,
        handleAddManual,
        handleOpenDetail,
        handleSave,
        handleDelete,
        handleAddEventToCalendar,
        handleRelink,
    } = useInstallationActions(section, settings, googleToken, isAdmin, generateSemanticId);

    // Gestione auto-apertura da URL (es: navigazione dal Calendario)
    useEffect(() => {
        if (!loading && installations.length > 0) {
            const params = new URLSearchParams(location.search);
            const instId = params.get('id');
            if (instId && !selectedInst) {
                const found = installations.find(i => 
                    i._firestoreId === instId || generateSemanticId(i) === instId
                );
                if (found) {
                    handleOpenDetail(found);
                    // Rimuove l'id dall'url per evitare riaperture non volute a refresh
                    navigate(location.pathname, { replace: true });
                }
            }
        }
    }, [loading, installations, location.search, selectedInst]);

    const getCardColor = (inst: Installation) => {
        if (inst.isInvoiced) return '#94a3b8';
        if (inst.tested) return 'var(--success-color)';
        if (inst.toTest) return '#facc15';
        return 'var(--secondary-color)';
    };

    const getGlowType = (inst: Installation): 'orange' | 'yellow' | 'green' | null => {
        if (inst.isInvoiced) return null;
        const firestoreData = inst._firestoreId ? dbData[inst._firestoreId] : null;
        const tested = firestoreData?.tested ?? inst.tested;
        const toTest = firestoreData?.toTest ?? inst.toTest;
        const sDateStr = firestoreData?.scheduledDate || inst.scheduledDate;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const parseAnyDate = (dateStr: string | undefined): Date | null => {
            if (!dateStr) return null;
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    let y = parseInt(parts[0]);
                    if (y < 100) y += 2000;
                    return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
            }
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const d = parseInt(parts[0]);
                    const m = parseInt(parts[1]);
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000;
                    return new Date(y, m - 1, d);
                }
            }
            return null;
        };

        if (tested) return 'green';
        if (toTest) return 'yellow';
        const sDate = parseAnyDate(sDateStr);
        if (sDate && sDate >= now) return 'orange';

        return null;
    };

    const filteredInstallations = useMemo(() => {
        return [...installations].filter((inst: Installation) => {
            if (!inst) return false;
            const search = (searchTerm || '').toLowerCase();
            const client = (inst.client || '').toLowerCase();
            const machine = (inst.machine || '').toLowerCase();
            const serial = (inst.serialSK || '').toLowerCase();
            const model = (inst.modelSK || '').toLowerCase();
            const site = (inst.installationSite || '').toLowerCase();
            const order = (inst.orderNumber || '').toLowerCase();

            return (
                client.includes(search) ||
                machine.includes(search) ||
                serial.includes(search) ||
                model.includes(search) ||
                site.includes(search) ||
                order.includes(search)
            );
        });
    }, [installations, searchTerm]);

    const activeInstallations = useMemo(() => {
        return filteredInstallations
            .filter((inst: Installation) => !inst.isInvoiced)
            .sort((a: Installation, b: Installation) => {
                const glowA = getGlowType(a);
                const glowB = getGlowType(b);

                // Gerarchia ordine: Arancione → Blu(null) → Giallo → Verde
                const priority = (glow: 'orange' | 'yellow' | 'green' | null): number => {
                    if (glow === 'orange') return 0;
                    if (glow === null) return 1; // Blu: tutto fermo
                    if (glow === 'yellow') return 2; // Da collaudare
                    if (glow === 'green') return 3; // Collaudata
                    return 4;
                };

                const diff = priority(glowA) - priority(glowB);
                if (diff !== 0) return diff;

                // A parità di stato, ordine alfabetico per Cliente
                const aClient = a.client || '';
                const bClient = b.client || '';
                return aClient.toLowerCase().localeCompare(bClient.toLowerCase());
            });
    }, [filteredInstallations, dbData]); // dbData è usato in getGlowType

    const invoicedInstallations = useMemo(() => {
        return filteredInstallations.filter((inst: Installation) => inst.isInvoiced);
    }, [filteredInstallations]);

    const isSectionEnabled = section === 's2' ? settings.section2InstallationsEnabled : settings.enableInstallations;

    if (!isSectionEnabled && !isSuperadmin) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                <AlertTriangle size={48} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                <h3>Sezione non abilitata</h3>
                <p>La gestione installazioni non è attiva al momento o non hai i permessi per vederla.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <div>
                    <h2 style={{ marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={28} /> Gestione Installazioni
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        In attesa | Da collaudare | Collaudata
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <ArrowDownWideNarrow size={18} />
                        <span className="hide-mobile">Sposta collaudate in fondo:</span>
                        <input
                            type="checkbox"
                            checked={sortVerifiedAtBottom}
                            onChange={(e) => setSortVerifiedAtBottom(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                    </div>
                    {isAdmin && orphanedData.length > 0 && (
                        <button
                            onClick={() => setShowOrphanVault(true)}
                            className="btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                background: '#fef2f2',
                                color: '#ef4444',
                                border: '1px solid #fecaca',
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.85rem',
                                borderRadius: 'var(--border-radius-sm)',
                                fontWeight: 600,
                            }}
                        >
                            <AlertTriangle size={15} />{' '}
                            <span className="hide-mobile">Dati Scollegati ({orphanedData.length})</span>
                        </button>
                    )}
                    {isSuperadmin && (
                        <button
                            onClick={() => handleHardResetDB(activeInstallations)}
                            className="btn"
                            title="Pulisci Cache DB Firestore per le installazioni non fatturate"
                            style={{
                                padding: '0.5rem',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                            }}
                        >
                            <Trash2 size={16} />{' '}
                            <span className="hide-mobile" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                Fix
                            </span>
                        </button>
                    )}
                    <button
                        onClick={handleAddManual}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                    >
                        <PlusCircle size={18} /> <span className="hide-mobile">Nuova</span>
                    </button>
                    <button
                        onClick={loadSheetData}
                        className="btn"
                        disabled={loading}
                        title="Ricarica dal foglio connesso"
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Cerca cliente, macchina, matricola o ordine..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.8rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.95rem',
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={40} className="spin" style={{ color: 'var(--secondary-color)' }} />
                    <p>Caricamento...</p>
                </div>
            ) : error ? (
                <div
                    className="glass-panel"
                    style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}
                >
                    <AlertTriangle size={32} style={{ color: 'var(--danger-color)', marginBottom: '1rem' }} />
                    <p>{error}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {/* Sezione Attive */}
                    <div>
                        <h4
                            style={{
                                marginBottom: '1rem',
                                color: 'var(--primary-color)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <Box size={20} /> Installazioni Attive ({activeInstallations.length})
                        </h4>
                        <div
                            style={
                                (settings as any).installationsLayoutMode === 'list-2col'
                                    ? {
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
                                          gap: '0.75rem',
                                      }
                                    : (settings as any).installationsLayoutMode === 'list'
                                      ? { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
                                      : (settings as any).installationsLayoutMode === 'grid-compact'
                                        ? {
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))',
                                              gap: '0.75rem',
                                          }
                                        : {
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                                              gap: '1.25rem',
                                          }
                            }
                        >
                            {activeInstallations.map((inst: Installation) => (
                                <InstallationCard
                                    key={generateSemanticId(inst)}
                                    inst={inst}
                                    layoutMode={(settings as any).installationsLayoutMode}
                                    getCardColor={getCardColor}
                                    getGlowType={getGlowType}
                                    generateSemanticId={generateSemanticId}
                                    handleOpenDetail={handleOpenDetail}
                                    setUsageModal={setUsageModal}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Sezione Fatturate (Grigio) */}
                    {invoicedInstallations.length > 0 && (
                        <div>
                            <h4
                                style={{
                                    marginBottom: '1rem',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <CheckCircle2 size={20} /> Installazioni Fatturate ({invoicedInstallations.length})
                            </h4>
                            <div
                                style={
                                    (settings as any).installationsLayoutMode === 'list-2col'
                                        ? {
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
                                              gap: '0.75rem',
                                          }
                                        : (settings as any).installationsLayoutMode === 'list'
                                          ? { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
                                          : (settings as any).installationsLayoutMode === 'grid-compact'
                                            ? {
                                                  display: 'grid',
                                                  gridTemplateColumns:
                                                      'repeat(auto-fill, minmax(min(100%, 160px), 1fr))',
                                                  gap: '0.75rem',
                                              }
                                            : {
                                                  display: 'grid',
                                                  gridTemplateColumns:
                                                      'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                                                  gap: '1.25rem',
                                              }
                                }
                            >
                                {invoicedInstallations.map((inst: Installation) => (
                                    <InstallationCard
                                        key={generateSemanticId(inst)}
                                        inst={inst}
                                        layoutMode={(settings as any).installationsLayoutMode}
                                        getCardColor={getCardColor}
                                        getGlowType={getGlowType}
                                        generateSemanticId={generateSemanticId}
                                        handleOpenDetail={handleOpenDetail}
                                        setUsageModal={setUsageModal}
                                    />
                                ))}

                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Professionale v1.9.6 */}
            {selectedInst && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        zIndex: 1000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '1rem',
                    }}
                >
                    <div
                        className="glass-panel modal-fullscreen-mobile"
                        style={{
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '95vh',
                            overflowY: 'auto',
                            padding: 0,
                            position: 'relative',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        {/* Header Modal */}
                        <div
                            style={{
                                padding: '1.5rem',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                background: 'rgba(255,255,255,0.05)',
                                gap: '1rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        backgroundColor: getCardColor(selectedInst),
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        color: '#fff',
                                    }}
                                >
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Dettaglio Installazione</h3>
                                    <span
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            display: 'block',
                                            marginTop: '0.2rem',
                                        }}
                                    >
                                        ID RIGA: {selectedInst.rowId} • ORDINE #{selectedInst.orderNumber}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedInst(null)}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    padding: '0.5rem',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    flexShrink: 0,
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {/* Sezione Cliente */}
                            <div style={{ marginBottom: '2rem', position: 'relative' }}>
                                <label
                                    style={{
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                        marginBottom: '0.4rem',
                                        display: 'block',
                                    }}
                                >
                                    Cliente / Ragione Sociale
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <User size={20} style={{ color: 'var(--primary-color)' }} />
                                    <input
                                        type="text"
                                        value={editData.localOverrides?.client ?? selectedInst.client}
                                        onChange={(e) =>
                                            setEditData((prev) => ({
                                                ...prev,
                                                localOverrides: { ...prev.localOverrides, client: e.target.value },
                                            }))
                                        }
                                        style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            background: 'none',
                                            borderBottom: '2px solid transparent',
                                            width: '100%',
                                            padding: '0.2rem 0',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--primary-color)')}
                                        onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                                    />
                                </div>
                            </div>

                            {/* Info Macchina e Pianificazione Grid */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                                    gap: '1.5rem',
                                    marginBottom: '2rem',
                                }}
                            >
                                <div
                                    className="glass-panel"
                                    style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <label
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: 'var(--text-secondary)',
                                            marginBottom: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                        }}
                                    >
                                        <Box size={14} /> DATI MACCHINA
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input
                                            placeholder="Nome Macchina"
                                            className="form-control"
                                            value={editData.localOverrides?.machine ?? selectedInst.machine}
                                            onChange={(e) =>
                                                setEditData((prev) => ({
                                                    ...prev,
                                                    localOverrides: { ...prev.localOverrides, machine: e.target.value },
                                                }))
                                            }
                                            style={{ border: '1px solid var(--border-subtle)', padding: '0.6rem' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {fieldConfig.showModelSK !== false && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        Modello SK
                                                    </label>
                                                    <input
                                                        placeholder="Modello SK"
                                                        className="form-control"
                                                        value={editData.localOverrides?.modelSK ?? selectedInst.modelSK}
                                                        onChange={(e) =>
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...prev.localOverrides,
                                                                    modelSK: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showSerialSK !== false && (
                                                <div style={{ flex: '1 1 120px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        Matricola
                                                    </label>
                                                    <input
                                                        placeholder="Matricola"
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.serialSK ?? selectedInst.serialSK
                                                        }
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...prev.localOverrides,
                                                                    serialSK: val,
                                                                },
                                                            }));
                                                        }}
                                                        onFocus={() => {
                                                            // if empty and we have a prefix, populate and select
                                                            const currentVal =
                                                                editData.localOverrides?.serialSK ??
                                                                selectedInst.serialSK;
                                                            if (!currentVal && settings.serialPrefix) {
                                                                setEditData((prev) => ({
                                                                    ...prev,
                                                                    localOverrides: {
                                                                        ...prev.localOverrides,
                                                                        serialSK: settings.serialPrefix,
                                                                    },
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showOrderNumber !== false && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        N. Ordine Principale
                                                    </label>
                                                    <input
                                                        placeholder="N. Ordine"
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.orderNumber ??
                                                            selectedInst.orderNumber ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...prev.localOverrides,
                                                                    orderNumber: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showOrderDfv !== false && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        N. ordine DFV
                                                    </label>
                                                    <input
                                                        placeholder="N. ordine DFV"
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.orderDfv ??
                                                            selectedInst.orderDfv ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...prev.localOverrides,
                                                                    orderDfv: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {fieldConfig.showPlanning !== false && (
                                    <div
                                        className="glass-panel"
                                        style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.03)' }}
                                    >
                                        <label
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: 'var(--text-secondary)',
                                                marginBottom: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                            }}
                                        >
                                            <Calendar size={14} /> PIANIFICAZIONE
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{ flex: '1 1 220px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        Programmazione (Data e Ora)
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-control"
                                                        value={
                                                            editData.scheduledDate
                                                                ? editData.scheduledDate.includes('T')
                                                                    ? editData.scheduledDate
                                                                    : editData.scheduledTime
                                                                      ? `${editData.scheduledDate}T${editData.scheduledTime}`
                                                                      : editData.scheduledDate
                                                                : ''
                                                        }
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val.includes('T')) {
                                                                const [, t] = val.split('T');
                                                                setEditData((prev) => ({
                                                                    ...prev,
                                                                    scheduledDate: val,
                                                                    scheduledTime: t,
                                                                }));
                                                            } else {
                                                                setEditData((prev) => ({
                                                                    ...prev,
                                                                    scheduledDate: val,
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                    {selectedInst.deliveryDate && !editData.scheduledDate && (
                                                        <div
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                color: 'var(--text-muted)',
                                                                marginTop: '0.2rem',
                                                            }}
                                                        >
                                                            📋 Foglio: {selectedInst.deliveryDate}
                                                        </div>
                                                    )}
                                                </div>
                                                <div
                                                    style={{
                                                        flex: '1 1 100%',
                                                        display: 'flex',
                                                        justifyContent: 'flex-end',
                                                        marginTop: '0.2rem',
                                                    }}
                                                >
                                                    {editData.scheduledDate && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditData((prev) => ({
                                                                    ...prev,
                                                                    scheduledDate: '',
                                                                    scheduledTime: '',
                                                                }))
                                                            }
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--danger-color)',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.3rem',
                                                                padding: '0.3rem 0.5rem',
                                                                borderRadius: '4px',
                                                                transition: 'background 0.2s',
                                                            }}
                                                            onMouseOver={(e) =>
                                                                (e.currentTarget.style.background =
                                                                    'rgba(239, 68, 68, 0.1)')
                                                            }
                                                            onMouseOut={(e) =>
                                                                (e.currentTarget.style.background = 'none')
                                                            }
                                                        >
                                                            <X size={14} /> Rimuovi Data
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '0.2rem',
                                                        display: 'block',
                                                    }}
                                                >
                                                    Sito / Destinazione
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <MapPin size={18} style={{ color: 'var(--danger-color)' }} />
                                                    <input
                                                        placeholder="Sito di installazione"
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.installationSite ??
                                                            selectedInst.installationSite
                                                        }
                                                        onChange={(e) =>
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...prev.localOverrides,
                                                                    installationSite: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Google Calendar Sync Button */}
                                            <div
                                                style={{
                                                    marginTop: '0.5rem',
                                                    paddingTop: '1rem',
                                                    borderTop: '1px solid #e2e8f0',
                                                }}
                                            >
                                                <button
                                                    onClick={() => handleAddEventToCalendar(connectGoogle)}
                                                    disabled={isSyncingCalendar || !editData.scheduledDate}
                                                    className="btn"
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.65rem',
                                                        backgroundColor: googleToken
                                                            ? editData.scheduledDate
                                                                ? 'rgba(20, 184, 166, 0.1)'
                                                                : 'rgba(255, 255, 255, 0.05)'
                                                            : 'rgba(255, 255, 255, 0.02)',
                                                        color: googleToken
                                                            ? editData.scheduledDate
                                                                ? 'var(--accent-teal)'
                                                                : 'var(--text-secondary)'
                                                            : 'var(--text-muted)',
                                                        border: `1px solid ${googleToken ? (editData.scheduledDate ? 'var(--accent-teal)' : 'var(--border-subtle)') : 'var(--border-subtle)'}`,
                                                        transition: 'all 0.2s',
                                                        cursor:
                                                            isSyncingCalendar ||
                                                            (!editData.scheduledDate && googleToken)
                                                                ? 'not-allowed'
                                                                : 'pointer',
                                                    }}
                                                >
                                                    {isSyncingCalendar ? (
                                                        <>
                                                            <RefreshCw className="spin" size={18} /> Sincronizzazione in
                                                            corso...
                                                        </>
                                                    ) : googleToken ? (
                                                        <>
                                                            <Calendar size={18} />{' '}
                                                            {editData.scheduledDate
                                                                ? 'Aggiungi a Google Calendar'
                                                                : 'Inserisci una data per sincronizzare'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LinkIcon size={18} /> Collega Google per sincronizzare
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Componenti Estratti (Al posto di Applicazioni) */}
                            {fieldConfig.showExtractedNotes !== false && (
                                <div
                                    style={{
                                        marginBottom: '2rem',
                                        padding: '1.5rem',
                                        backgroundColor: 'rgba(236, 72, 153, 0.05)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(236, 72, 153, 0.2)',
                                    }}
                                >
                                    <label
                                        style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            color: '#f472b6',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <Truck size={20} /> COMPONENTI ESTRATTI (CODICI DALLE NOTE)
                                    </label>
                                    <div
                                        style={{
                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(236, 72, 153, 0.1)',
                                            minHeight: '120px',
                                        }}
                                    >
                                        {selectedInst.extractedNotes ? (
                                            <ul
                                                style={{
                                                    margin: 0,
                                                    paddingLeft: '1.2rem',
                                                    color: '#831843',
                                                    fontSize: '0.95rem',
                                                    lineHeight: '1.6',
                                                }}
                                            >
                                                {selectedInst.extractedNotes
                                                    .split('\n')
                                                    .filter((line) => line.trim() !== '')
                                                    .map((line, idx) => (
                                                        <li key={idx} style={{ marginBottom: '0.4rem' }}>
                                                            {line}
                                                        </li>
                                                    ))}
                                            </ul>
                                        ) : (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    color: '#f472b6',
                                                    fontStyle: 'italic',
                                                    fontSize: '0.95rem',
                                                    marginTop: '1.5rem',
                                                }}
                                            >
                                                Nessun componente aggiuntivo registrato nelle note del Foglio Google.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Nuova Selezione Moduli / Opzioni */}
                            {fieldConfig.showModules !== false && (
                                <div
                                    style={{
                                        marginBottom: '2rem',
                                        padding: '1.5rem',
                                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                    }}
                                >
                                    <label
                                        style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            color: '#34d399',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <ListChecks size={20} /> SELEZIONE MODULI DA ATTIVARE
                                    </label>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '0.6rem',
                                        }}
                                    >
                                        {(settings.installationModules || []).map((feature: string, idx: number) => {
                                            const selectedList = editData.localOverrides?.selectedFeatures || [];
                                            const isSelected = selectedList.includes(feature);
                                            const hasAnySelected = selectedList.length > 0;
                                            const isFaint = hasAnySelected && !isSelected;

                                            return (
                                                <label
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        cursor: 'pointer',
                                                        opacity: isFaint ? 0.35 : 1,
                                                        fontWeight: isSelected ? 700 : 500,
                                                        backgroundColor: isSelected
                                                            ? 'rgba(16, 185, 129, 0.1)'
                                                            : 'transparent',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const current =
                                                                editData.localOverrides?.selectedFeatures || [];
                                                            let next;
                                                            if (e.target.checked) {
                                                                next = [...current, feature];
                                                            } else {
                                                                next = current.filter((f: string) => f !== feature);
                                                            }
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...(prev.localOverrides || {}),
                                                                    selectedFeatures: next,
                                                                },
                                                            }));
                                                        }}
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            cursor: 'pointer',
                                                            accentColor: '#16a34a',
                                                        }}
                                                    />
                                                    <span style={{ lineHeight: '1.4' }}>{feature}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Spazio Note Molto Ampio */}
                            {fieldConfig.showTechnicalNotes !== false && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <label
                                        style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            color: 'var(--text-secondary)',
                                            marginBottom: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <MessageSquare size={18} /> NOTE E OSSERVAZIONI TECNICHE
                                    </label>
                                    <textarea
                                        className="form-control"
                                        placeholder="Inserisci qui i commenti originali o le nuove note dell'amministrazione..."
                                        value={editData.comments || ''}
                                        onChange={(e) => setEditData((prev) => ({ ...prev, comments: e.target.value }))}
                                        style={{
                                            minHeight: '120px',
                                            width: '100%',
                                            padding: '1.5rem',
                                            fontSize: '1rem',
                                            lineHeight: '1.6',
                                            borderRadius: '16px',
                                            border: '1px solid var(--border-subtle)',
                                            backgroundColor: 'var(--bg-elevated)',
                                            color: 'var(--text-primary)',
                                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Stati (Fatturato, Da collaudare, Collaudata) - SPOSTATI IN BASSO */}
                            <div
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    padding: '1.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-subtle)',
                                    marginBottom: '1rem',
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '2rem',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    cursor: 'pointer',
                                                    opacity: editData.toTest ? 1 : 0.5,
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editData.toTest || false}
                                                    onChange={(e) =>
                                                        setEditData((prev) => ({
                                                            ...prev,
                                                            toTest: e.target.checked,
                                                            tested: e.target.checked ? prev.tested : false,
                                                        }))
                                                    }
                                                    style={{ width: '28px', height: '28px' }}
                                                />
                                                <span
                                                    style={{
                                                        fontWeight: 800,
                                                        color: '#b45309',
                                                        fontSize: '0.85rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                    }}
                                                >
                                                    <AlertTriangle size={16} /> DA COLLAUDARE
                                                </span>
                                            </label>

                                            {editData.toTest && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.3rem',
                                                        minWidth: '150px',
                                                        padding: '0.5rem',
                                                        background: 'rgba(234, 179, 8, 0.1)',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                                    }}
                                                >
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 900,
                                                            color: '#92400e',
                                                            textTransform: 'uppercase',
                                                        }}
                                                    >
                                                        Data Collaudo
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={editData.testDate || ''}
                                                        onChange={(e) =>
                                                            setEditData((prev) => ({
                                                                ...prev,
                                                                testDate: e.target.value,
                                                            }))
                                                        }
                                                        className="form-control"
                                                        style={{
                                                            padding: '0.4rem',
                                                            fontSize: '0.9rem',
                                                            border: '1px solid #d97706',
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <label
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                cursor: 'pointer',
                                                opacity: editData.tested ? 1 : 0.5,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={editData.tested || false}
                                                onChange={(e) =>
                                                    setEditData((prev) => ({
                                                        ...prev,
                                                        tested: e.target.checked,
                                                        toTest: e.target.checked ? true : prev.toTest,
                                                    }))
                                                }
                                                style={{ width: '28px', height: '28px' }}
                                            />
                                            <span
                                                style={{
                                                    fontWeight: 800,
                                                    color: '#15803d',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                }}
                                            >
                                                <CheckCircle2 size={16} /> COLLAUDATA
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Azioni */}
                        <div
                            style={{
                                padding: '1.25rem 1.5rem',
                                borderTop: '1px solid var(--border-subtle)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(0,0,0,0.2)',
                                flexWrap: 'wrap',
                                gap: '1rem',
                            }}
                        >
                            <button
                                onClick={handleDelete}
                                className="btn"
                                style={{
                                    backgroundColor: 'transparent',
                                    borderColor: '#ef4444',
                                    color: '#ef4444',
                                    padding: '0.5rem 1rem',
                                }}
                            >
                                <Trash2 size={18} /> {deleteConfirm ? 'Conferma eliminazione?' : 'Elimina scheda'}
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {selectedInst.isManual && googleToken && (
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            color: '#0f766e',
                                            fontWeight: 600,
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            backgroundColor: '#f0fdfa',
                                            border: '1px solid #ccfbf1',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={exportToSheet}
                                            onChange={(e) => setExportToSheet(e.target.checked)}
                                            style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                                        />
                                        Esporta su Google Sheets
                                    </label>
                                )}
                                <button
                                    onClick={() => setSelectedInst(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '0.5rem 1.5rem',
                                        fontSize: '1.05rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    {saving ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE CAMERA DI SICUREZZA ORPHAN VAULT */}
            {showOrphanVault && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                    }}
                >
                    <div
                        className="glass-panel"
                        style={{
                            background: 'var(--bg-surface)',
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '2rem',
                            borderRadius: '16px',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem',
                                borderBottom: '1px solid var(--border-subtle)',
                                paddingBottom: '1rem',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    color: 'var(--danger-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <AlertTriangle size={24} /> Dati Scollegati (Camera di Sicurezza)
                            </h3>
                            <button
                                onClick={() => {
                                    setShowOrphanVault(false);
                                    setOrphanToRelink(null);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div
                            style={{
                                backgroundColor: '#fff8f1',
                                padding: '1rem',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                borderLeft: '4px solid #f97316',
                                fontSize: '0.9rem',
                                color: '#9a3412',
                            }}
                        >
                            Qui trovi i dati inseriti dall'App (appunti, collaudi, pianificazioni) che{' '}
                            <strong>non corrispondono pi� a nessuna riga sul foglio Google</strong> a causa di rinomine,
                            cancellazioni o errori nel foglio. Puoi ricollegarli a un'installazione esistente per non
                            perdere il lavoro fatto!
                        </div>

                        {orphanedData.map((orphan) => (
                            <div
                                key={orphan._firestoreId}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    background: '#f8fafc',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                    }}
                                >
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                                            {orphan.client || 'Cliente Sconosciuto'}
                                        </h4>
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                color: '#475569',
                                                display: 'grid',
                                                gridTemplateColumns: 'max-content 1fr',
                                                columnGap: '1rem',
                                                rowGap: '0.2rem',
                                            }}
                                        >
                                            <strong>Macchina/SN:</strong>{' '}
                                            <span>
                                                {orphan.machine || '-'} / {orphan.serialSK || '-'}
                                            </span>
                                            <strong>Dati App:</strong>{' '}
                                            <span>
                                                {orphan.comments ? (
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.2rem',
                                                            padding: '0.1rem 0',
                                                        }}
                                                    >
                                                        <MessageSquare size={14} /> Note presenti{' '}
                                                    </span>
                                                ) : (
                                                    ''
                                                )}
                                                {orphan.tested ? (
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.2rem',
                                                            padding: '0.1rem 0',
                                                        }}
                                                    >
                                                        <CheckCircle2 size={14} color="#15803d" /> Collaudata{' '}
                                                    </span>
                                                ) : (
                                                    ''
                                                )}
                                                {orphan.toTest ? (
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.2rem',
                                                            padding: '0.1rem 0',
                                                        }}
                                                    >
                                                        <AlertTriangle size={14} color="#b45309" /> Da Collaudare{' '}
                                                    </span>
                                                ) : (
                                                    ''
                                                )}
                                                {orphan.scheduledDate ? (
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.2rem',
                                                            padding: '0.1rem 0',
                                                        }}
                                                    >
                                                        <Calendar size={14} /> Pianificata{' '}
                                                    </span>
                                                ) : (
                                                    ''
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {orphanToRelink?._firestoreId !== orphan._firestoreId ? (
                                        <button
                                            className="btn btn-primary"
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                gap: '0.4rem',
                                                alignItems: 'center',
                                            }}
                                            onClick={() => {
                                                setOrphanToRelink(orphan);
                                                setRelinkTargetId('');
                                            }}
                                        >
                                            <LinkIcon size={14} /> Ricollega Dati
                                        </button>
                                    ) : null}
                                </div>

                                {orphanToRelink?._firestoreId === orphan._firestoreId && (
                                    <div
                                        style={{
                                            marginTop: '1rem',
                                            padding: '1rem',
                                            background: '#fff',
                                            border: '1px solid #bfdbfe',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: '#1d4ed8',
                                            }}
                                        >
                                            Scegli l'installazione corrente a cui unire questi dati:
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <select
                                                className="form-control"
                                                style={{ flex: 1, minWidth: '250px' }}
                                                value={relinkTargetId}
                                                onChange={(e) => setRelinkTargetId(e.target.value)}
                                            >
                                                <option value="">-- Seleziona Riga Target --</option>
                                                {installations.map((i) => (
                                                    <option key={i._firestoreId} value={i._firestoreId}>
                                                        {i.client} - {i.machine} (Ord: {i.orderNumber})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                className="btn btn-primary"
                                                disabled={!relinkTargetId}
                                                onClick={() =>
                                                    handleRelink(orphan._firestoreId!, relinkTargetId, orphanedData)
                                                }
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                Conferma Fusione
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setOrphanToRelink(null)}
                                            >
                                                Annulla
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <InventoryUsageModal
                isOpen={usageModal.isOpen}
                onClose={() => setUsageModal({ isOpen: false, instId: '', clientName: '' })}
                referenceId={usageModal.instId}
                referenceType="installation"
                referenceName={usageModal.clientName}
            />
        </div>
    );
};
