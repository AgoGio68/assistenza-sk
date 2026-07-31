import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

import { Installation } from '../types';
import {
    Truck,
    Box,
    AlertTriangle,
    RefreshCw,
    PlusCircle,
    Package,
    X,
    User,
    Calendar,
    MapPin,
    Link as LinkIcon,
    MessageSquare,
    CheckCircle2,
    Save,
    Trash2,
    ArrowDownWideNarrow,
} from 'lucide-react';
import { InventoryUsageModal } from '../components/InventoryUsageModal';
import { InstallationCard } from '../components/InstallationCard';
import { CollaudoChecklistModal } from '../components/CollaudoChecklistModal';
import { useLanguage } from '../contexts/LanguageContext';

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

    const { t } = useLanguage();
    const { settings } = useSettings();
    const { isSuperadmin, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // UI Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortVerifiedAtBottom, setSortVerifiedAtBottom] = useState(true);
    const [collaudoInst, setCollaudoInst] = useState<Installation | null>(null);

    // --- custom hooks ---
    const {
        installations,
        orphanedData,
        loading,
        error,
        dbData,
        generateSemanticId,
        handleHardResetDB,
    } = useInstallations(section, settings, isSuperadmin) as any;

    const {
        selectedInst,
        setSelectedInst,
        editData,
        setEditData,
        saving,
        deleteConfirm,
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
        handleRelink,
        handleResetAssignment,
    } = useInstallationActions(section, settings, isAdmin, generateSemanticId) as any;

    // Configurazione visibilità campi basata sulla sezione
    const fieldConfig = section === 's2' ? {
        showModelSK: false,
        showSerialSK: true,
        showOrderNumber: true,
        showOrderDfv: true,
        showPlanning: true,
        showExtractedNotes: true,
        showModules: true,
        showTechnicalNotes: true
    } : {
        showModelSK: true,
        showSerialSK: true,
        showOrderNumber: true,
        showOrderDfv: false,
        showPlanning: true,
        showExtractedNotes: true,
        showModules: true,
        showTechnicalNotes: true
    };

    // Gestione auto-apertura da URL
    useEffect(() => {
        if (!loading && installations.length > 0) {
            const params = new URLSearchParams(location.search);
            const instId = params.get('id');
            if (instId && !selectedInst) {
                const found = installations.find((i: any) => 
                    i._firestoreId === instId || generateSemanticId(i) === instId
                );
                if (found) {
                    handleOpenDetail(found);
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

    const filteredInstallations = [...installations].filter((inst: Installation) => {
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

    const activeInstallations = filteredInstallations
        .filter((inst: Installation) => !inst.isInvoiced)
        .sort((a: Installation, b: Installation) => {
            if (sortVerifiedAtBottom) {
                const glowA = getGlowType(a);
                const glowB = getGlowType(b);

                const priority = (glow: 'orange' | 'yellow' | 'green' | null): number => {
                    if (glow === 'orange') return 0;
                    if (glow === null) return 1;
                    if (glow === 'yellow') return 2;
                    if (glow === 'green') return 3;
                    return 4;
                };

                const diff = priority(glowA) - priority(glowB);
                if (diff !== 0) return diff;
            }

            const aClient = a.client || '';
            const bClient = b.client || '';
            return aClient.toLowerCase().localeCompare(bClient.toLowerCase());
        });

    const invoicedInstallations = filteredInstallations.filter((inst: Installation) => inst.isInvoiced);

    const isSectionEnabled = section === 's2' ? settings.section2InstallationsEnabled : settings.enableInstallations;

    if (!isSectionEnabled && !isSuperadmin) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                <AlertTriangle size={48} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                <h3>{t('common.notEnabled')}</h3>
                <p>{t('inst.sectionDisabledDesc')}</p>
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
                        <Truck size={28} /> {t('inst.title')}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {t('inst.subtitle')}
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
                        <span className="hide-mobile">{t('inst.sortVerified')}:</span>
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
                            <span className="hide-mobile">{t('inst.orphans')} ({orphanedData.length})</span>
                        </button>
                    )}
                    {isSuperadmin && (
                        <button
                            onClick={() => handleHardResetDB(activeInstallations)}
                            className="btn"
                            title={t('inst.fixHint')}
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
                        <PlusCircle size={18} /> <span className="hide-mobile">{t('common.add')}</span>
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder={t('inst.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.8rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.95rem',
                        background: 'transparent',
                        color: 'inherit',
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={40} className="spin" style={{ color: 'var(--primary-color)' }} />
                    <p>{t('common.loading')}</p>
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
                    {/* Active Installations */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Box size={20} /> {t('inst.active')} ({activeInstallations.length})
                        </h4>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: settings.installationsLayoutMode === 'grid-compact' 
                                ? 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))' 
                                : settings.installationsLayoutMode?.includes('list')
                                ? '1fr'
                                : 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                            gap: '1.25rem'
                        }}>
                            {activeInstallations.map((inst) => (
                                <InstallationCard
                                    key={generateSemanticId(inst)}
                                    inst={inst}
                                    layoutMode={settings.installationsLayoutMode || 'default'}
                                    getCardColor={getCardColor}
                                    getGlowType={getGlowType}
                                    generateSemanticId={generateSemanticId}
                                    handleOpenDetail={handleOpenDetail}
                                    setUsageModal={setUsageModal}
                                    setCollaudoInst={setCollaudoInst}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Invoiced Section */}
                    {invoicedInstallations.length > 0 && (
                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={20} /> {t('inst.invoiced')} ({invoicedInstallations.length})
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                                gap: '1rem',
                                opacity: 0.7
                            }}>
                                {invoicedInstallations.map((inst) => (
                                    <InstallationCard
                                        key={generateSemanticId(inst)}
                                        inst={inst}
                                        layoutMode={settings.installationsLayoutMode || 'default'}
                                        getCardColor={getCardColor}
                                        getGlowType={getGlowType}
                                        generateSemanticId={generateSemanticId}
                                        handleOpenDetail={handleOpenDetail}
                                        setUsageModal={setUsageModal}
                                        setCollaudoInst={setCollaudoInst}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Professionale v1.9.6 - Detail Panel */}
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
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{t('inst.detailTitle')}</h3>
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
                                    {t('inst.field.client')}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <User size={20} style={{ color: 'var(--primary-color)' }} />
                                    <input
                                        type="text"
                                        value={editData.localOverrides?.client ?? selectedInst.client}
                                        onChange={(e) =>
                                            setEditData((prev: any) => ({
                                                ...prev,
                                                localOverrides: { ...(prev.localOverrides || {}), client: e.target.value },
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
                                        <Box size={14} /> {t('inst.machineData')}
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input
                                            placeholder={t('inst.field.machine')}
                                            className="form-control"
                                            value={editData.localOverrides?.machine ?? selectedInst.machine}
                                            onChange={(e) =>
                                                setEditData((prev: any) => ({
                                                    ...prev,
                                                    localOverrides: { ...(prev.localOverrides || {}), machine: e.target.value },
                                                }))
                                            }
                                            style={{ border: '1px solid var(--border-subtle)', padding: '0.6rem' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {fieldConfig.showModelSK && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {t('inst.field.model')}
                                                    </label>
                                                    <input
                                                        placeholder={t('inst.field.model')}
                                                        className="form-control"
                                                        value={editData.localOverrides?.modelSK ?? selectedInst.modelSK}
                                                        onChange={(e) =>
                                                            setEditData((prev: any) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...(prev.localOverrides || {}),
                                                                    modelSK: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showSerialSK && (
                                                <div style={{ flex: '1 1 120px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {t('inst.field.serial')}
                                                    </label>
                                                    <input
                                                        placeholder={t('inst.field.serial')}
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.serialSK ?? selectedInst.serialSK
                                                        }
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditData((prev: any) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...(prev.localOverrides || {}),
                                                                    serialSK: val,
                                                                },
                                                            }));
                                                        }}
                                                        onFocus={() => {
                                                            const currentVal =
                                                                editData.localOverrides?.serialSK ??
                                                                selectedInst.serialSK;
                                                            if (!currentVal && settings.serialPrefix) {
                                                                setEditData((prev: any) => ({
                                                                    ...prev,
                                                                    localOverrides: {
                                                                        ...(prev.localOverrides || {}),
                                                                        serialSK: settings.serialPrefix,
                                                                    },
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {fieldConfig.showOrderNumber && (
                                                <div style={{ flex: '1 1 100px' }}>
                                                    <label
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-secondary)',
                                                            marginBottom: '0.2rem',
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {t('inst.field.orderNumber')}
                                                    </label>
                                                    <input
                                                        placeholder={t('inst.field.orderNumber')}
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.orderNumber ??
                                                            selectedInst.orderNumber ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setEditData((prev: any) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...(prev.localOverrides || {}),
                                                                    orderNumber: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {fieldConfig.showPlanning && (
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
                                            <Calendar size={14} /> {t('inst.planning')}
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
                                                        {t('inst.field.scheduledDate')}
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
                                                                const [, tVal] = val.split('T');
                                                                setEditData((prev: any) => ({
                                                                    ...prev,
                                                                    scheduledDate: val,
                                                                    scheduledTime: tVal,
                                                                }));
                                                            } else {
                                                                setEditData((prev: any) => ({
                                                                    ...prev,
                                                                    scheduledDate: val,
                                                                }));
                                                            }
                                                        }}
                                                    />
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
                                                                setEditData((prev: any) => ({
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
                                                            }}
                                                        >
                                                            <X size={14} /> {t('common.delete')}
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
                                                    {t('inst.field.site')}
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <MapPin size={18} style={{ color: 'var(--danger-color)' }} />
                                                    <input
                                                        placeholder={t('inst.field.site')}
                                                        className="form-control"
                                                        value={
                                                            editData.localOverrides?.installationSite ??
                                                            selectedInst.installationSite
                                                        }
                                                        onChange={(e) =>
                                                            setEditData((prev: any) => ({
                                                                ...prev,
                                                                localOverrides: {
                                                                    ...(prev.localOverrides || {}),
                                                                    installationSite: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Nota dal Foglio (extractedNotes) — sempre visibile quando abilitato */}
                            {fieldConfig.showExtractedNotes && (
                                <div style={{
                                    marginBottom: '2rem',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '12px',
                                    background: 'rgba(251, 191, 36, 0.06)',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                }}>
                                    <label style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#b45309',
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        textTransform: 'uppercase',
                                    }}>
                                        <AlertTriangle size={14} /> Nota dal Foglio
                                    </label>
                                    {/* Testo proveniente dal foglio sorgente (read-only) */}
                                    {selectedInst.extractedNotes && (
                                        <p style={{
                                            margin: '0 0 0.75rem 0',
                                            fontSize: '0.95rem',
                                            color: '#92400e',
                                            lineHeight: '1.5',
                                            whiteSpace: 'pre-wrap',
                                            padding: '0.5rem 0.75rem',
                                            background: 'rgba(251, 191, 36, 0.1)',
                                            borderRadius: '6px',
                                            borderLeft: '3px solid #f59e0b',
                                        }}>
                                            {selectedInst.extractedNotes}
                                        </p>
                                    )}
                                    {/* Campo editabile per nota manuale aggiuntiva */}
                                    <textarea
                                        className="form-control"
                                        placeholder={selectedInst.extractedNotes
                                            ? "Aggiungi una nota integrativa..."
                                            : "Nota aggiuntiva (non presente nel foglio)..."}
                                        value={editData.localOverrides?.extractedNotes || ''}
                                        onChange={(e) =>
                                            setEditData((prev: any) => ({
                                                ...prev,
                                                localOverrides: {
                                                    ...(prev.localOverrides || {}),
                                                    extractedNotes: e.target.value,
                                                },
                                            }))
                                        }
                                        style={{
                                            minHeight: '70px',
                                            width: '100%',
                                            padding: '0.75rem',
                                            fontSize: '0.9rem',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(251, 191, 36, 0.4)',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            color: 'var(--text-primary)',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Lista Moduli / Applicazioni (da installationModules del pannello admin) */}
                            {fieldConfig.showModules && (settings.installationModules?.length ?? 0) > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                        marginBottom: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}>
                                        <CheckCircle2 size={18} /> {t('inst.field.modules')}
                                    </label>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                                        gap: '0.6rem',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-subtle)',
                                        background: 'rgba(255,255,255,0.02)',
                                    }}>
                                        {(settings.installationModules || []).map((moduleName: string) => {
                                            const existing = (editData.applications || []).find(
                                                (a: { name: string; checked: boolean; qty?: string }) => a.name === moduleName
                                            );
                                            const isChecked = existing?.checked ?? false;
                                            const qty = existing?.qty ?? '';
                                            return (
                                                <label
                                                    key={moduleName}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        cursor: 'pointer',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '8px',
                                                        background: isChecked
                                                            ? 'rgba(20, 184, 166, 0.1)'
                                                            : 'transparent',
                                                        border: `1px solid ${isChecked ? 'rgba(20, 184, 166, 0.4)' : 'var(--border-subtle)'}`,
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setEditData((prev: any) => {
                                                                const prevApps: { name: string; checked: boolean; qty?: string }[] = prev.applications || [];
                                                                const idx = prevApps.findIndex((a) => a.name === moduleName);
                                                                let newApps;
                                                                if (idx >= 0) {
                                                                    newApps = prevApps.map((a, i) =>
                                                                        i === idx ? { ...a, checked } : a
                                                                    );
                                                                } else {
                                                                    newApps = [...prevApps, { name: moduleName, checked, qty: '' }];
                                                                }
                                                                return { ...prev, applications: newApps };
                                                            });
                                                        }}
                                                        style={{ width: '18px', height: '18px', flexShrink: 0 }}
                                                    />
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: isChecked ? 600 : 400,
                                                        color: isChecked ? 'var(--accent-teal, #14b8a6)' : 'var(--text-primary)',
                                                        flex: 1,
                                                    }}>
                                                        {moduleName}
                                                    </span>
                                                    {isChecked && (
                                                        <input
                                                            type="text"
                                                            placeholder="qty"
                                                            value={qty}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                const newQty = e.target.value;
                                                                setEditData((prev: any) => {
                                                                    const prevApps: { name: string; checked: boolean; qty?: string }[] = prev.applications || [];
                                                                    const idx = prevApps.findIndex((a) => a.name === moduleName);
                                                                    let newApps;
                                                                    if (idx >= 0) {
                                                                        newApps = prevApps.map((a, i) =>
                                                                            i === idx ? { ...a, qty: newQty } : a
                                                                        );
                                                                    } else {
                                                                        newApps = [...prevApps, { name: moduleName, checked: true, qty: newQty }];
                                                                    }
                                                                    return { ...prev, applications: newApps };
                                                                });
                                                            }}
                                                            style={{
                                                                width: '45px',
                                                                padding: '0.2rem 0.4rem',
                                                                fontSize: '0.75rem',
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--border-subtle)',
                                                                background: 'var(--bg-elevated)',
                                                                color: 'var(--text-primary)',
                                                                textAlign: 'center',
                                                            }}
                                                        />
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Technical Notes Area */}
                            {fieldConfig.showTechnicalNotes && (
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
                                        <MessageSquare size={18} /> {t('inst.technicalNotes')}
                                    </label>
                                    <textarea
                                        className="form-control"
                                        placeholder={t('inst.notesPlaceholder')}
                                        value={editData.comments || ''}
                                        onChange={(e) => setEditData((prev: any) => ({ ...prev, comments: e.target.value }))}
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
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Test Status Indicators */}
                            <div
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    padding: '1.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-subtle)',
                                    marginBottom: '1rem',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: editData.toTest ? 1 : 0.5 }}>
                                        <input
                                            type="checkbox"
                                            checked={editData.toTest || false}
                                            onChange={(e) => setEditData((prev: any) => ({
                                                ...prev,
                                                toTest: e.target.checked,
                                                tested: e.target.checked ? prev.tested : false
                                            }))}
                                            style={{ width: '28px', height: '28px' }}
                                        />
                                        <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <AlertTriangle size={16} /> {t('instCard.toTest')}
                                        </span>
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: editData.tested ? 1 : 0.5 }}>
                                        <input
                                            type="checkbox"
                                            checked={editData.tested || false}
                                            onChange={(e) => setEditData((prev: any) => ({
                                                ...prev,
                                                tested: e.target.checked,
                                                toTest: e.target.checked ? true : prev.toTest
                                            }))}
                                            style={{ width: '28px', height: '28px' }}
                                        />
                                        <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <CheckCircle2 size={16} /> {t('instCard.tested')}
                                        </span>
                                    </label>
                                </div>

                                {/* Data Collaudo (Opzionale) - Mostrato solo se da collaudare */}
                                {editData.toTest && (
                                    <div
                                        style={{
                                            marginTop: '1.5rem',
                                            padding: '1.25rem',
                                            backgroundColor: 'rgba(234, 179, 8, 0.08)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(234, 179, 8, 0.2)',
                                            animation: 'fadeInUp 0.3s ease forwards',
                                        }}
                                    >
                                        <label
                                            style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                color: '#eab308',
                                                marginBottom: '0.6rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                            }}
                                        >
                                            <Calendar size={16} /> Data Collaudo (Opzionale)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={editData.testDate || ''}
                                            onChange={(e) => setEditData((prev: any) => ({ ...prev, testDate: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'rgba(0,0,0,0.2)',
                                                color: '#f1f5f9',
                                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                                padding: '0.8rem',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                outline: 'none',
                                            }}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(234,179,8,0.7)', marginTop: '0.5rem', marginBottom: 0 }}>
                                            Questa data popolerà automaticamente il calendario.
                                        </p>
                                    </div>
                                )}
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
                                <Trash2 size={18} /> {deleteConfirm ? t('inst.deleteConfirm') : t('inst.delete')}
                            </button>

                            {(editData.scheduledDate || editData.testDate || editData.toTest || editData.tested) && (
                                <button
                                    onClick={handleResetAssignment}
                                    className="btn"
                                    style={{
                                        backgroundColor: 'transparent',
                                        borderColor: '#f59e0b',
                                        color: '#f59e0b',
                                        padding: '0.5rem 1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <RefreshCw size={18} /> Rimuovi Assegnazione
                                </button>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={() => setSelectedInst(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    {t('common.cancel')}
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
                                    {t('common.save')}
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
                                <AlertTriangle size={24} /> {t('inst.orphanVaultTitle')}
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
                            {t('inst.orphanVaultDesc')}
                        </div>

                        {orphanedData.map((orphan: any) => (
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
                                            <LinkIcon size={14} /> {t('inst.relink')}
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
                                            {t('inst.chooseRelinkTarget')}:
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <select
                                                className="form-control"
                                                style={{ flex: 1, minWidth: '250px' }}
                                                value={relinkTargetId}
                                                onChange={(e) => setRelinkTargetId(e.target.value)}
                                            >
                                                <option value="">-- {t('inst.chooseRelinkTarget')} --</option>
                                                {activeInstallations.map((i) => (
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
                                                {t('common.confirm')}
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setOrphanToRelink(null)}
                                            >
                                                {t('common.cancel')}
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

            {collaudoInst && (
                <CollaudoChecklistModal
                    installationId={collaudoInst._firestoreId || generateSemanticId(collaudoInst)}
                    machineName={collaudoInst.machine || ''}
                    clientName={collaudoInst.client || ''}
                    scheduledDate={collaudoInst.scheduledDate}
                    onClose={() => setCollaudoInst(null)}
                />
            )}
        </div>
    );
};
