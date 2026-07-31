import React, { useState, useEffect } from 'react';
import { ClipboardList, Filter, Tag, User, Ticket, Building2, Settings, Package, Calendar, ChevronDown, ChevronUp, History } from 'lucide-react';
import { AuditLogService } from '../../services/AuditLogService';
import { ActivityLog } from '../../types';

export const GlobalAuditLog: React.FC = () => {
    const [entries, setEntries] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('ALL');

    const fetchLog = async () => {
        setLoading(true);
        try {
            const data = await AuditLogService.fetchLogs(500);
            setEntries(data);
        } catch (err) {
            console.error('Error fetching audit log:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLog();
    }, []);

    const filteredEntries = entries.filter((e) => {
        if (filterType !== 'ALL' && e.resourceType !== filterType) return false;
        return true;
    });

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return '#10b981'; // Green
            case 'UPDATE': return '#3b82f6'; // Blue
            case 'DELETE': return '#ef4444'; // Red
            case 'STATUS_CHANGE': return '#f59e0b'; // Amber
            case 'ASSIGN': return '#8b5cf6'; // Violet
            case 'APPROVE': return '#10b981';
            case 'REJECT': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'TICKET': return <Ticket size={18} />;
            case 'USER': return <User size={18} />;
            case 'COMPANY': return <Building2 size={18} />;
            case 'SETTINGS': return <Settings size={18} />;
            case 'INSTALLATION': return <Calendar size={18} />;
            case 'INVENTORY_ITEM': return <Package size={18} />;
            default: return <History size={18} />;
        }
    };

    const getResourceLabel = (type: string) => {
        switch (type) {
            case 'TICKET': return 'Assistenza';
            case 'USER': return 'Utente';
            case 'COMPANY': return 'Anagrafica Azienda';
            case 'SETTINGS': return 'Impostazioni Sistema';
            case 'INSTALLATION': return 'Installazione / Calendario';
            case 'INVENTORY_ITEM': return 'Magazzino';
            default: return type;
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardList size={24} style={{ color: 'var(--accent-teal)' }} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Log Attività Globale</h3>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Monitoraggio attività amministrative e modifiche di sistema
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                    >
                        <option value="ALL">Tutte le attività</option>
                        <option value="TICKET">🎫 Assistenze</option>
                        <option value="USER">👥 Utenti</option>
                        <option value="COMPANY">🏢 Aziende</option>
                        <option value="SETTINGS">⚙️ Impostazioni</option>
                        <option value="INSTALLATION">📅 Installazioni</option>
                        <option value="INVENTORY_ITEM">📦 Magazzino</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento log in corso...</div>
            ) : filteredEntries.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nessuna attività registrata.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredEntries.map((entry) => <LogEntryRow key={entry.id} entry={entry} getActionColor={getActionColor} getResourceIcon={getResourceIcon} getResourceLabel={getResourceLabel} />)}
                </div>
            )}
        </div>
    );
};

const LogEntryRow: React.FC<{ entry: ActivityLog, getActionColor: any, getResourceIcon: any, getResourceLabel: any }> = ({ entry, getActionColor, getResourceIcon, getResourceLabel }) => {
    const [showMeta, setShowMeta] = useState(false);
    const dateStr = new Date(entry.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    return (
        <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '160px 1fr auto',
            gap: '1.5rem',
            alignItems: 'start',
            transition: 'transform 0.2s',
        }}>
            {/* Date and User */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{dateStr}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {entry.userName || (entry.userEmail ? entry.userEmail.split('@')[0] : 'Sistema')}
                </div>
                {entry.userEmail && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.userEmail}
                    </div>
                )}
                <div style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 900, 
                    color: 'white', 
                    background: entry.userRole === 'superadmin' ? 'var(--primary-color)' : '#64748b',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    width: 'fit-content',
                    marginTop: '0.1rem'
                }}>
                    {entry.userRole.toUpperCase()}
                </div>
            </div>
            
            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: getActionColor(entry.action) + '15', 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        color: getActionColor(entry.action),
                        border: `1px solid ${getActionColor(entry.action)}44`
                    }}>
                        {getResourceIcon(entry.resourceType)}
                        {getResourceLabel(entry.resourceType)}
                    </div>
                </div>
                
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.5', fontWeight: 500 }}>
                    {entry.details}
                </div>
                
                {/* Additional metadata representation */}
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div style={{ marginTop: '0.3rem' }}>
                        <button 
                            onClick={() => setShowMeta(!showMeta)}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--primary-color)', 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: 0
                            }}
                        >
                            {showMeta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showMeta ? 'Nascondi dettagli tecnici' : 'Mostra dettagli tecnici'}
                        </button>
                        
                        {showMeta && (
                            <pre style={{ 
                                background: 'rgba(0,0,0,0.25)', 
                                padding: '0.75rem', 
                                borderRadius: '8px', 
                                fontSize: '0.75rem', 
                                color: '#a5b4fc', 
                                marginTop: '0.6rem',
                                overflowX: 'auto',
                                border: '1px solid rgba(255,255,255,0.05)',
                                fontFamily: 'monospace'
                            }}>
                                {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
            
            {/* Resource ID target */}
            <div style={{ textAlign: 'right' }}>
                {entry.resourceId && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'flex-end', 
                        gap: '0.3rem', 
                        fontSize: '0.7rem', 
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px'
                    }}>
                        <Tag size={10} /> {entry.resourceId.substring(0, 8)}
                    </div>
                )}
            </div>
        </div>
    );
};
