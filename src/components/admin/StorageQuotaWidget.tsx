import React, { useState, useEffect } from 'react';
import { StorageQuotaService, StorageQuotaSummary } from '../../services/StorageQuotaService';
import {
    HardDrive,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Layers,
    ShieldAlert,
} from 'lucide-react';


export const StorageQuotaWidget: React.FC = () => {
    const [quota, setQuota] = useState<StorageQuotaSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadQuota();
    }, []);

    const loadQuota = async () => {
        setLoading(true);
        try {
            const data = await StorageQuotaService.calculateQuota();
            setQuota(data);
        } catch (err) {
            console.error('[StorageQuotaWidget] Errore calcolo quote:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadQuota();
    };

    if (loading && !quota) {
        return (
            <div
                style={{
                    background: 'var(--bg-surface, #ffffff)',
                    padding: '1.5rem',
                    borderRadius: 'var(--border-radius-md, 12px)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #64748b)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Calcolo quote e spazio Firebase in corso...</span>
                </div>
            </div>
        );
    }

    if (!quota) return null;

    const percent = quota.percentageUsed;
    const isCritical = percent >= 90;
    const isWarning = percent >= 75 && percent < 90;

    // Colore barra principale
    const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
    const barBg = isCritical ? 'rgba(239,68,68,0.12)' : isWarning ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)';

    return (
        <div
            style={{
                background: 'var(--bg-surface, #ffffff)',
                padding: '1.75rem',
                borderRadius: 'var(--border-radius-md, 12px)',
                border: isCritical ? '2px solid #ef4444' : isWarning ? '2px solid #f59e0b' : '1px solid var(--border-color, #cbd5e1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
            }}
        >
            {/* Header del Widget */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary, #0f172a)' }}>
                        <HardDrive size={22} style={{ color: barColor }} />
                        Monitoraggio Spazio & Quota Piano Gratuito (Firebase Spark)
                    </h4>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                        Conteggio documenti in tempo reale e stima dell'occupazione rispetto ai limiti gratuiti del database.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Badge Stato */}
                    {isCritical ? (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: '1px solid #fca5a5',
                            }}
                        >
                            <ShieldAlert size={14} /> ALLERTA QUOTA ({percent}%)
                        </span>
                    ) : isWarning ? (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: '1px solid #fde68a',
                            }}
                        >
                            <AlertTriangle size={14} /> ATTENZIONE ({percent}%)
                        </span>
                    ) : (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: '1px solid #bbf7d0',
                            }}
                        >
                            <CheckCircle2 size={14} /> PIANO GRATUITO OK ({percent}%)
                        </span>
                    )}

                    {/* Bottone Ricarica */}
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="btn"
                        style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                        }}
                        title="Ricalcola le quote in tempo reale"
                    >
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        {refreshing ? 'Calcolo...' : 'Ricalcola'}
                    </button>
                </div>
            </div>

            {/* BANNER DI ALLERTA CRITICA SE > 90% */}
            {isCritical && (
                <div
                    style={{
                        background: '#fef2f2',
                        border: '2px solid #ef4444',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start',
                    }}
                >
                    <ShieldAlert size={26} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                            🚨 AVVISO DI EMERGENZA: Superato il 90% del Piano Gratuito!
                        </div>
                        <p style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.4' }}>
                            Hai occupato <b>{quota.estimatedStorageMb} MB</b> su <b>{quota.limitStorageMb} MB</b> ({quota.percentageUsed}%). 
                            Rimangono soltanto <b>{quota.freeStorageMb} MB</b> liberi. Per evitare blocchi di scrittura o costi imprevisti, 
                            effettua un backup CSV ed elimina i vecchi log di attività o i ticket archiviati.
                        </p>
                    </div>
                </div>
            )}

            {/* Grafico Barra Spazio Principale */}
            <div
                style={{
                    background: barBg,
                    border: `1px solid ${barColor}40`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                        Spazio Firestore Occupato: <span style={{ color: barColor }}>{quota.estimatedStorageMb} MB</span> / {quota.limitStorageMb} MB (1 GiB)
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>
                        {quota.percentageUsed}% utilizzato
                    </span>
                </div>

                {/* Progress bar visuale */}
                <div
                    style={{
                        width: '100%',
                        height: '18px',
                        background: '#e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                    }}
                >
                    <div
                        style={{
                            width: `${Math.max(1, Math.min(100, quota.percentageUsed))}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
                            borderRadius: '10px',
                            transition: 'width 0.6s ease',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <span><b>Totale Record:</b> {quota.totalDocuments.toLocaleString('it-IT')} documenti</span>
                    <span><b>Spazio Libero:</b> <strong style={{ color: '#16a34a' }}>{quota.freeStorageMb} MB</strong> rimanenti</span>
                </div>
            </div>

            {/* Box Limiti & Parametri Piano Gratuito */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.85rem',
                }}
            >
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tetto Storage Firestore</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>1 GiB (1.024 MB)</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>Massimo storage gratuito</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Storage Foto & Allegati</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>5 GB Gratis</div>
                    <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>Bucket Storage Firebase</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Operazioni Giornaliere</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>50k Letture / 20k Scritture</div>
                    <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.2rem' }}>Reset ogni 24 ore</div>
                </div>
            </div>

            {/* Breakdown per Collezione (Grafico di ripartizione) */}
            <div>
                <h5 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                    <Layers size={17} style={{ color: '#6366f1' }} />
                    Dettaglio Occupazione per Collezione
                </h5>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '0.75rem',
                    }}
                >
                    {quota.collections.map((col) => {
                        const colMb = Math.round((col.estimatedSizeKb / 1024) * 100) / 100;
                        const colShare = quota.estimatedStorageMb > 0 
                            ? Math.round((colMb / quota.estimatedStorageMb) * 100) 
                            : 0;

                        return (
                            <div
                                key={col.name}
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                                        {col.displayName}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: col.color }}>
                                        {col.docCount.toLocaleString('it-IT')} doc
                                    </span>
                                </div>

                                {/* Barra proporzionale interna */}
                                <div
                                    style={{
                                        width: '100%',
                                        height: '6px',
                                        background: '#f1f5f9',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${Math.max(col.docCount > 0 ? 3 : 0, colShare)}%`,
                                            height: '100%',
                                            background: col.color,
                                            borderRadius: '4px',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                                    <span>{col.estimatedSizeKb >= 1024 ? `${colMb} MB` : `${col.estimatedSizeKb} KB`}</span>
                                    <span>{colShare}% del totale</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
