import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ticket, Installation, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Calendar, Truck, Ticket as TicketIcon, Zap, Filter, Clock, MapPin } from 'lucide-react';
import { fetchInstallations } from '../services/InstallationService';

export const Home: React.FC = () => {
    const { currentUser } = useAuth();
    const { settings } = useSettings();
    
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [dbInstallations, setDbInstallations] = useState<Record<string, Partial<Installation>>>({});
    const [activeFilter, setActiveFilter] = useState<'all' | 'installations' | 'tickets' | 'collaudi'>('all');
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    // Quick Date Edit State
    const [editingItem, setEditingItem] = useState<{ id: string, type: 'ticket' | 'installation', date: string } | null>(null);

    // 1. Fetch Users (for names)
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const namesMap: Record<string, string> = {};
            snapshot.forEach(doc => {
                const userData = doc.data() as UserProfile;
                namesMap[doc.id] = userData.displayName || userData.email || 'Utente';
            });
            setUserNames(namesMap);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Tickets (only scheduled)
    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'tickets'), where('status', 'in', ['aperto', 'preso_in_carico']));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Ticket))
                .filter(t => !!t.scheduledDate);
            setTickets(fetched);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // 3. Fetch Installations (Sheet + DB)
    useEffect(() => {
        const loadInst = async () => {
            const sheetUrl = settings.installationsSheetUrl;
            if (!sheetUrl) return;
            try {
                const data = await fetchInstallations(sheetUrl);
                setInstallations(data);
            } catch (err) {
                console.error("Home/Installations error:", err);
            }
        };
        loadInst();

        const unsubDb = onSnapshot(collection(db, 'installation_data'), (snap) => {
            const dataMap: Record<string, Partial<Installation>> = {};
            snap.forEach(doc => {
                dataMap[doc.id] = doc.data() as Partial<Installation>;
            });
            setDbInstallations(dataMap);
        });

        return () => unsubDb();
    }, [settings.installationsSheetUrl]);

    // Merge Installations logic (Simplified for Dashboard)
    const mergedInstallations: (Installation & { type: 'installation' })[] = installations
        .map(inst => {
            const clean = (s: string) => (s || '').trim().toLowerCase().replace(/\//g, '-').replace(/\s+/g, '_');
            const id = inst._firestoreId || `inst-${clean(inst.orderNumber)}-${clean(inst.client)}-${clean(inst.machine)}`;
            const extra = dbInstallations[id] || {};
            return { ...inst, ...extra, _firestoreId: id, type: 'installation' as const };
        })
        .filter(inst => {
            if (inst.toTest) return !!inst.testDate && !inst.isInvoiced && !inst.tested;
            return !!inst.scheduledDate && !inst.isInvoiced && !inst.tested;
        });

    // Create separate items for Installations and Collaudi if testDate is present
    const dashboardInstallations: (any)[] = [];
    mergedInstallations.forEach(inst => {
        // 1. Common Installation item (only if scheduledDate exists and not yet tested)
        if (inst.scheduledDate) {
            let displayDate = inst.scheduledDate;
            if (inst.scheduledTime && !displayDate.includes('T')) {
                displayDate = `${inst.scheduledDate}T${inst.scheduledTime}`;
            }
            dashboardInstallations.push({
                ...inst,
                displayDate: displayDate,
                dashboardType: 'installation',
                dashboardId: `inst-${inst._firestoreId}`
            });
        }

        // 2. Separate Collaudo item if toTest is true AND testDate is set
        if (inst.toTest && inst.testDate) {
            dashboardInstallations.push({
                ...inst,
                displayDate: inst.testDate,
                dashboardType: 'collaudo',
                dashboardId: `col-${inst._firestoreId}`,
                isCollaudo: true
            });
        }
    });

    // Combine and Sort
    const allItems = [
        ...tickets.map(t => ({ 
            ...t, 
            type: 'ticket' as const, 
            dashboardType: t.isCollaudo ? 'collaudo' : 'ticket',
            displayDate: t.scheduledDate,
            dashboardId: `tick-${t.id}` 
        })),
        ...dashboardInstallations
    ].sort((a, b) => {
        const dateA = new Date(a.displayDate).getTime();
        const dateB = new Date(b.displayDate).getTime();
        return dateA - dateB;
    });

    const filteredItems = allItems.filter(item => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'installations') return item.dashboardType === 'installation';
        if (activeFilter === 'tickets') return item.dashboardType === 'ticket';
        if (activeFilter === 'collaudi') return item.dashboardType === 'collaudo';
        return true;
    });

    const formatForInput = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleUpdateDate = async () => {
        if (!editingItem) return;
        try {
            if (editingItem.type === 'ticket') {
                const cleanId = editingItem.id.startsWith('tick-') ? editingItem.id.substring(5) : editingItem.id;
                const ref = doc(db, 'tickets', cleanId);
                await updateDoc(ref, { scheduledDate: editingItem.date, updatedAt: Date.now() });
            } else {
                // Determine the correct doc ID and field to update
                const isCollaudoItem = editingItem.id.startsWith('col-');
                const isInstItem = editingItem.id.startsWith('inst-');
                
                // Remove ONLY the first prefix (inst- or col-)
                let cleanId = editingItem.id;
                if (isCollaudoItem) cleanId = editingItem.id.substring(4);
                else if (isInstItem) cleanId = editingItem.id.substring(5);
                
                const finalRef = doc(db, 'installation_data', cleanId);
                
                if (isCollaudoItem) {
                    await updateDoc(finalRef, { testDate: editingItem.date, updatedAt: Date.now() });
                } else {
                    await updateDoc(finalRef, { scheduledDate: editingItem.date, updatedAt: Date.now() });
                }
            }
            setEditingItem(null);
        } catch (err) {
            alert("Errore aggiornamento data");
        }
    };

    const getStatusColor = (item: any) => {
        if (item.dashboardType === 'collaudo') return '#facc15';
        if (item.type === 'ticket') {
            if ((item as Ticket).urgency === 'urgente') return 'var(--danger-color)';
            return 'var(--primary-color)';
        }
        return 'var(--accent-teal)';
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--text-primary), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Dashboard Attività
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Attività programmate e collaudi in arrivo.</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                {[
                    { id: 'all', label: 'Tutto', icon: <Filter size={14}/> },
                    { id: 'installations', label: 'Installazioni', icon: <Truck size={14}/> },
                    { id: 'tickets', label: 'Ticket', icon: <TicketIcon size={14}/> },
                    { id: 'collaudi', label: 'Collaudi', icon: <Zap size={14}/> }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id as any)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', borderRadius: '100px',
                            border: '1px solid ' + (activeFilter === f.id ? 'var(--primary-color)' : 'var(--border-subtle)'),
                            background: activeFilter === f.id ? 'var(--primary-color)' : 'var(--bg-elevated)',
                            color: activeFilter === f.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                        }}
                    >
                        {f.icon} {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-lg)', border: '1px dashed var(--border-subtle)' }}>
                        <Calendar size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>Nessuna attività programmata trovata.</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const displayDate = new Date(item.displayDate!);
                        
                        return (
                            <div
                                key={item.dashboardId}
                                className={`glass-panel ${item.type === 'ticket' && (item as any).urgency === 'urgente' ? 'blink-border' : ''}`}
                                style={{
                                    padding: '0.85rem 1rem',
                                    borderLeft: `6px solid ${getStatusColor(item)}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    position: 'relative',
                                    background: 'var(--bg-surface)',
                                    boxShadow: 'var(--shadow-md)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-subtle)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                                            <span 
                                                className={item.dashboardType === 'collaudo' ? 'blink-yellow-glow' : ''}
                                                style={{ 
                                                    fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', 
                                                    padding: '0.25rem 0.6rem', borderRadius: '4px',
                                                    background: item.dashboardType === 'collaudo' ? 'rgba(234, 179, 8, 0.4)' : (item.dashboardType === 'installation' ? 'rgba(99,102,241,0.2)' : 'rgba(20,184,166,0.15)'),
                                                    color: item.dashboardType === 'collaudo' ? '#facc15' : getStatusColor(item),
                                                    border: `1px solid ${getStatusColor(item)}44`
                                                }}
                                            >
                                                {item.dashboardType === 'installation' ? 'INSTALLAZIONE' : item.dashboardType === 'collaudo' ? 'COLLAUDO' : 'ASSISTENZA'}
                                            </span>
                                            {item.type === 'ticket' && (item as any).urgency === 'urgente' && (
                                                <span style={{ fontSize: '0.7rem', background: 'var(--danger-color)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 900, boxShadow: '0 0 10px rgba(239,68,68,0.4)' }}>URGENTE</span>
                                            )}
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.5rem', lineHeight: 1.2 }}>
                                            {item.type === 'installation' ? (item as any).client : (item as any).companyName}
                                        </h3>
                                    </div>
                                    <div 
                                        onClick={() => setEditingItem({ id: item.dashboardId!, type: item.type, date: formatForInput(item.displayDate!) })}
                                        style={{ 
                                            textAlign: 'center', cursor: 'pointer', background: 'var(--bg-elevated)', 
                                            padding: '0.45rem 0.8rem', borderRadius: '10px', border: '2px solid var(--border-subtle)',
                                            boxShadow: 'var(--shadow-md)',
                                            minWidth: '88px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{displayDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 950, color: 'white', marginTop: '0.05rem' }}>{displayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <Clock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600 }}>{item.type === 'installation' ? (item as any).machine : (item as any).description.substring(0, 100) + (item.description.length > 100 ? '...' : '')}</span>
                                    </div>
                                    {item.type === 'installation' && (item as any).installationSite && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <MapPin size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span>{(item as any).installationSite}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        <span>{item.type === 'ticket' ? (userNames[(item as any).assignedTo || ''] || (item as any).assigneeName || 'Non assegnato') : ''}</span>
                                    </div>
                                    
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick Date Edit Modal */}
            {editingItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: 'var(--shadow-xl)' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={20} color="var(--primary-color)" /> Modifica Data
                        </h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>NUOVA DATA E ORA</label>
                            <input 
                                type="datetime-local" 
                                value={editingItem.date}
                                onChange={e => setEditingItem({ ...editingItem, date: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 'var(--border-radius-md)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>Annulla</button>
                            <button onClick={handleUpdateDate} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary-color)', border: 'none', color: 'white', borderRadius: 'var(--border-radius-md)', fontWeight: 700, cursor: 'pointer' }}>Salva</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .glow-yellow {
                    animation: glowPulseYellow 2s infinite;
                    border-color: rgba(234, 179, 8, 0.5) !important;
                }
                @keyframes glowPulseYellow {
                    0%, 100% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.2); }
                    50% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4); }
                }
            `}</style>
        </div>
    );
};
