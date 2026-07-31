import React from 'react';
import { Box, Calendar, DollarSign, Package, MessageSquare, ListChecks, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Installation } from '../types';

interface InstallationCardProps {
    inst: Installation;
    layoutMode: string;
    getCardColor: (inst: Installation) => string;
    getGlowType: (inst: Installation) => 'orange' | 'yellow' | 'green' | null;
    generateSemanticId: (inst: Installation) => string;
    handleOpenDetail: (inst: Installation) => void;
    setUsageModal: (modal: any) => void;
    setCollaudoInst: (inst: Installation) => void;
}

export const InstallationCard: React.FC<InstallationCardProps> = ({
    inst,
    layoutMode,
    getCardColor,
    getGlowType,
    generateSemanticId,
    handleOpenDetail,
    setUsageModal,
    setCollaudoInst,
}) => {
    const navigate = useNavigate();
    const cardColor = getCardColor(inst);
    const glowType = getGlowType(inst);
    const id = generateSemanticId(inst);
    const hasNotes = !!inst.comments;
    const hasChecklist = inst.applications?.some((a) => a.checked);

    const glowStyle = glowType === 'orange'
        ? { animation: 'glowPulseOrange 2s infinite', borderColor: 'rgba(249, 115, 22, 0.5)' }
        : glowType === 'yellow'
        ? { animation: 'glowPulseYellow 2s infinite', borderColor: 'rgba(234, 179, 8, 0.5)' }
        : glowType === 'green'
        ? { animation: 'glowPulseGreen 2s infinite', borderColor: 'rgba(16, 185, 129, 0.5)' }
        : {};

    const baseStyle: React.CSSProperties = {
        padding: '1.25rem',
        borderLeft: `6px solid ${cardColor}`,
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        ...glowStyle,
    };

    if (layoutMode === 'list' || layoutMode === 'list-2col') {
        return (
            <div
                key={id}
                onClick={() => handleOpenDetail(inst)}
                className={`glass-panel card-hover ${glowType ? `flash-${glowType}` : ''}`}
                style={{
                    ...baseStyle,
                    padding: '0.75rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.25fr) auto',
                    alignItems: 'center',
                    gap: '1rem',
                    backgroundColor: inst.isInvoiced ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                    opacity: inst.isInvoiced ? 0.8 : 1,
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inst.client}
                        {inst.installationSite && (
                            <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                                {' - '}{inst.installationSite}
                            </span>
                        )}
                    </h3>
                </div>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <Box size={14} style={{ flexShrink: 0 }} />{' '}
                    <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.machine}</strong>
                </div>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} />{' '}
                    <span style={{ whiteSpace: 'nowrap' }}>{inst.scheduledDate || inst.deliveryDate}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                    {inst.isInvoiced && <DollarSign size={16} color="var(--text-secondary)" />}
                    {hasNotes && <MessageSquare size={14} color="var(--text-secondary)" />}
                    {hasChecklist && <ListChecks size={14} color="var(--success-color)" />}
                    {(inst.toTest || inst.tested) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollaudoInst(inst);
                            }}
                            title="Checklist Collaudo"
                            style={{
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#d97706',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.2rem',
                                cursor: 'pointer',
                            }}
                        >
                            <ListChecks size={18} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/rapportini');
                        }}
                        title="Vedi Inviato"
                        style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.2rem',
                            cursor: 'pointer',
                        }}
                    >
                        <Camera size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setUsageModal({ isOpen: true, instId: inst._firestoreId || '', clientName: inst.client });
                        }}
                        style={{
                            background: 'rgba(16,185,129,0.15)',
                            color: '#10b981',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.2rem',
                            cursor: 'pointer',
                        }}
                    >
                        <Package size={18} />
                    </button>
                </div>
            </div>
        );
    }

    if (layoutMode === 'grid-compact') {
        return (
            <div
                key={id}
                onClick={() => handleOpenDetail(inst)}
                className={`glass-panel card-hover ${glowType ? `flash-${glowType}` : ''}`}
                style={{
                    ...baseStyle,
                    padding: '0.75rem',
                    borderLeftWidth: '5px',
                    backgroundColor: inst.isInvoiced ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                    opacity: inst.isInvoiced ? 0.8 : 1,
                }}
            >
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '0.3rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    {inst.isInvoiced && <DollarSign size={14} />}
                    {(inst.toTest || inst.tested) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollaudoInst(inst);
                            }}
                            title="Checklist Collaudo"
                            style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#d97706', border: 'none', borderRadius: '4px', padding: '1px', cursor: 'pointer' }}
                        >
                            <ListChecks size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/rapportini');
                        }}
                        title="Vedi Inviato"
                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '4px', padding: '1px', cursor: 'pointer' }}
                    >
                        <Camera size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setUsageModal({ isOpen: true, instId: inst._firestoreId || '', clientName: inst.client });
                        }}
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '4px', padding: '1px', cursor: 'pointer' }}
                    >
                        <Package size={14} />
                    </button>
                </div>
                <h3 style={{
                    margin: '0 0 0.4rem 0',
                    fontSize: '0.95rem',
                    lineHeight: '1.2',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    paddingRight: '1.5rem',
                }}>
                    {inst.client}
                </h3>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                        <Box size={12} style={{ flexShrink: 0 }} />{' '}
                        <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.machine}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                        <Calendar size={12} style={{ flexShrink: 0 }} />{' '}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.scheduledDate || inst.deliveryDate}</span>
                    </div>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Ord. {inst.orderNumber}</span>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        {hasNotes && <MessageSquare size={12} />}
                        {hasChecklist && <ListChecks size={12} color="var(--success-color)" />}
                    </div>
                </div>
            </div>
        );
    }

    // Default Grid (Standard)
    return (
        <div
            key={id}
            onClick={() => handleOpenDetail(inst)}
            className={`glass-panel card-hover ${glowType ? `flash-${glowType}` : ''}`}
            style={{
                ...baseStyle,
                backgroundColor: inst.isInvoiced ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                opacity: inst.isInvoiced ? 0.8 : 1,
            }}
        >
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                {inst.isInvoiced && <DollarSign size={20} />}
                {(inst.toTest || inst.tested) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCollaudoInst(inst);
                        }}
                        title="Checklist Collaudo"
                        style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#d97706', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}
                    >
                        <ListChecks size={20} />
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate('/rapportini');
                    }}
                    title="Vedi Inviato"
                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}
                >
                    <Camera size={20} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setUsageModal({ isOpen: true, instId: inst._firestoreId || '', clientName: inst.client });
                    }}
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}
                >
                    <Package size={20} />
                </button>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                {inst.client}
                {inst.installationSite && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                        {' - '}{inst.installationSite}
                    </span>
                )}
            </h3>
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Box size={14} /> <strong>{inst.machine}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} /> {inst.scheduledDate || inst.deliveryDate}{' '}
                    {inst.scheduledTime && `alle ${inst.scheduledTime}`}
                </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Ordine {inst.orderNumber}</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {hasNotes && <MessageSquare size={14} />}
                    {hasChecklist && <ListChecks size={14} color="var(--success-color)" />}
                </div>
            </div>
        </div>
    );
};
