import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchInstallations } from '../services/InstallationService';
import { Installation } from '../types';
import { Truck, Calendar, Box, AlertTriangle, RefreshCw, X, Save, MessageSquare, Trash2, CheckCircle2, DollarSign, ListChecks, ArrowDownWideNarrow, MapPin, User } from 'lucide-react';
import { setDoc, collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const Installations: React.FC = () => {
    const { settings } = useSettings();
    const { isSuperadmin, isAdmin } = useAuth();
    const [sheetData, setSheetData] = useState<Installation[]>([]);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [dbData, setDbData] = useState<Record<string, Partial<Installation>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortVerifiedAtBottom, setSortVerifiedAtBottom] = useState(true);

    // Modal & Note State
    const [selectedInst, setSelectedInst] = useState<Installation | null>(null);
    const [editData, setEditData] = useState<Partial<Installation>>({});
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Load Google Sheets Data
    const loadSheetData = async () => {
        if (!settings.installationsSheetUrl) {
            setError("URL del foglio Google non configurato nel pannello Admin.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await fetchInstallations(settings.installationsSheetUrl);
            setSheetData(data);
        } catch (err) {
            setError("Impossibile caricare i dati dal foglio. Verifica che l'URL sia corretto e il foglio sia pubblico.");
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for Firestore overrides
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'installation_data'), (snap) => {
            const dataMap: Record<string, Partial<Installation>> = {};
            snap.forEach(doc => {
                dataMap[doc.id] = doc.data() as Partial<Installation>;
            });
            setDbData(dataMap);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        loadSheetData();
    }, [settings.installationsSheetUrl]);

    // Helper to generate a unique ID for each installation row (merged with Firestore)
    const getInstId = (inst: Installation) => inst.rowId || `${inst.orderNumber}-${inst.serialSK || ''}-${inst.machine || ''}`.replace(/\s+/g, '_');

    // Merge Sheet Data with Firestore Data
    useEffect(() => {
        const merged = sheetData.map(inst => {
            const id = getInstId(inst);
            const extra = dbData[id] || {};
            return {
                ...inst,
                ...extra,
                ...(extra.localOverrides || {})
            };
        }).filter(inst => !inst.isDeleted);

        setInstallations(merged);
    }, [sheetData, dbData]);

    const handleOpenDetail = (inst: Installation) => {
        setSelectedInst(inst);
        setEditData({
            comments: inst.comments || '',
            isInvoiced: inst.isInvoiced || false,
            toTest: inst.toTest || false,
            tested: inst.tested || false,
            scheduledTime: inst.scheduledTime || '',
            scheduledDate: inst.scheduledDate || '',
            applications: inst.applications || [],
            localOverrides: inst.localOverrides || {}
        });
        setDeleteConfirm(false);
    };

    const handleSave = async () => {
        if (!selectedInst) return;
        setSaving(true);
        try {
            const id = getInstId(selectedInst);
            const docRef = doc(db, 'installation_data', id);
            await setDoc(docRef, {
                ...editData,
                updatedAt: Date.now(),
                updatedBy: isAdmin ? 'admin' : 'superadmin'
            }, { merge: true });

            alert("Modifiche salvate con successo!");
            setSelectedInst(null);
        } catch (err) {
            console.error("Save error:", err);
            alert("Errore durante il salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedInst) return;
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
        }

        setSaving(true);
        try {
            const id = getInstId(selectedInst);
            const docRef = doc(db, 'installation_data', id);
            await setDoc(docRef, { isDeleted: true }, { merge: true });
            alert("Installazione eliminata.");
            setSelectedInst(null);
        } catch (err) {
            console.error("Delete error:", err);
            alert("Errore durante l'eliminazione.");
        } finally {
            setSaving(false);
        }
    };

    const toggleApp = (index: number) => {
        const newApps = [...(editData.applications || [])];
        newApps[index].checked = !newApps[index].checked;
        setEditData(prev => ({ ...prev, applications: newApps }));
    };

    const updateAppQty = (index: number, qty: string) => {
        const newApps = [...(editData.applications || [])];
        newApps[index].qty = qty;
        setEditData(prev => ({ ...prev, applications: newApps }));
    };

    const removeApp = (index: number) => {
        const newApps = [...(editData.applications || [])];
        newApps.splice(index, 1);
        setEditData(prev => ({ ...prev, applications: newApps }));
    };

    const addApp = (name: string) => {
        if (!name.trim()) return;
        const newApps = [...(editData.applications || []), { name, checked: false }];
        setEditData(prev => ({ ...prev, applications: newApps }));
    };

    const getCardColor = (inst: Installation) => {
        if (inst.tested) return 'var(--success-color)';
        if (inst.toTest) return '#facc15';
        return 'var(--secondary-color)';
    };

    const sortedInstallations = [...installations]
        .filter(inst => {
            const search = searchTerm.toLowerCase();
            return (
                inst.client.toLowerCase().includes(search) ||
                inst.machine.toLowerCase().includes(search) ||
                inst.serialSK.toLowerCase().includes(search) ||
                inst.orderNumber.includes(search)
            );
        })
        .sort((a, b) => {
            if (sortVerifiedAtBottom) {
                if (a.tested && !b.tested) return 1;
                if (!a.tested && b.tested) return -1;
            }
            return 0;
        });

    if (!settings.enableInstallations && !isSuperadmin) {
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={28} /> Gestione Installazioni
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Blu: In attesa | Giallo: Da collaudare | Verde: Collaudata
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <ArrowDownWideNarrow size={18} />
                        <span>Sposta collaudate in fondo:</span>
                        <input
                            type="checkbox"
                            checked={sortVerifiedAtBottom}
                            onChange={e => setSortVerifiedAtBottom(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                    </div>
                    <button onClick={loadSheetData} className="btn" disabled={loading}>
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
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={40} className="spin" style={{ color: 'var(--secondary-color)' }} />
                    <p>Caricamento...</p>
                </div>
            ) : error ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--danger-color)', marginBottom: '1rem' }} />
                    <p>{error}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                    {sortedInstallations.map((inst) => (
                        <div
                            key={getInstId(inst)}
                            onClick={() => handleOpenDetail(inst)}
                            className="glass-panel card-hover"
                            style={{
                                padding: '1.25rem',
                                borderLeft: `6px solid ${getCardColor(inst)}`,
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                position: 'relative'
                            }}
                        >
                            {inst.isInvoiced && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#059669' }}>
                                    <DollarSign size={20} />
                                </div>
                            )}
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{inst.client}</h3>
                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Box size={14} /> <strong>{inst.machine}</strong>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Calendar size={14} /> {inst.scheduledDate || inst.deliveryDate} {inst.scheduledTime && `alle ${inst.scheduledTime}`}
                                </div>
                            </div>
                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ordine {inst.orderNumber}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {inst.comments && <MessageSquare size={14} />}
                                    {inst.applications?.some(a => a.checked) && <ListChecks size={14} color="var(--success-color)" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Professionale v1.9.6 */}
            {selectedInst && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div className="glass-panel modal-fullscreen-mobile" style={{ width: '100%', maxWidth: '900px', maxHeight: '95vh', overflowY: 'auto', padding: 0, position: 'relative', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

                        {/* Header Modal */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ backgroundColor: getCardColor(selectedInst), padding: '0.75rem', borderRadius: '12px', color: '#fff' }}>
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Dettaglio Installazione</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>ID RIGA: {selectedInst.rowId} • ORDINE #{selectedInst.orderNumber}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInst(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {/* Sezione Cliente */}
                            <div style={{ marginBottom: '2rem', position: 'relative' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Cliente / Ragione Sociale</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <User size={20} style={{ color: 'var(--primary-color)' }} />
                                    <input
                                        type="text"
                                        value={editData.localOverrides?.client ?? selectedInst.client}
                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, client: e.target.value } }))}
                                        style={{ fontSize: '1.5rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: '2px solid transparent', width: '100%', padding: '0.2rem 0', transition: 'border-color 0.2s' }}
                                        onFocus={e => e.target.style.borderBottomColor = 'var(--primary-color)'}
                                        onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                                    />
                                </div>
                            </div>

                            {/* Info Macchina e Pianificazione Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '1.25rem', background: '#f8fafc' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Box size={14} /> DATI MACCHINA
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input
                                            placeholder="Nome Macchina"
                                            className="form-control"
                                            value={editData.localOverrides?.machine ?? selectedInst.machine}
                                            onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, machine: e.target.value } }))}
                                            style={{ border: '1px solid #cbd5e1', padding: '0.6rem' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <div style={{ flex: '1 1 100px' }}>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Modello SK</label>
                                                <input
                                                    placeholder="Modello SK"
                                                    className="form-control"
                                                    value={editData.localOverrides?.modelSK ?? selectedInst.modelSK}
                                                    onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, modelSK: e.target.value } }))}
                                                />
                                            </div>
                                            <div style={{ flex: '1 1 120px' }}>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Matricola</label>
                                                <input
                                                    placeholder="Matricola"
                                                    className="form-control"
                                                    value={editData.localOverrides?.serialSK ?? selectedInst.serialSK}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, serialSK: val } }));
                                                    }}
                                                    onFocus={() => {
                                                        // if empty and we have a prefix, populate and select
                                                        const currentVal = editData.localOverrides?.serialSK ?? selectedInst.serialSK;
                                                        if (!currentVal && settings.serialPrefix) {
                                                            setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, serialSK: settings.serialPrefix } }));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-panel" style={{ padding: '1.25rem', background: '#f8fafc' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={14} /> PIANIFICAZIONE
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <div style={{ flex: '1 1 120px' }}>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Data Installazione</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={editData.scheduledDate || selectedInst.deliveryDate}
                                                    onChange={e => setEditData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                                />
                                            </div>
                                            <div style={{ flex: '1 1 100px' }}>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Ora Locale</label>
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={editData.scheduledTime || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'block' }}>Sito / Destinazione</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MapPin size={18} style={{ color: 'var(--danger-color)' }} />
                                                <input
                                                    placeholder="Sito di installazione"
                                                    className="form-control"
                                                    value={editData.localOverrides?.installationSite ?? selectedInst.installationSite}
                                                    onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, installationSite: e.target.value } }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Applicazioni Checklist - Spostato SOPRA */}
                            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0369a1', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ListChecks size={20} /> APPLICAZIONI DA AGGIUNGERE
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                    <input id="new-app-v196" type="text" className="form-control" placeholder="Nuova applicazione (Invio per aggiungere)..." onKeyDown={e => { if (e.key === 'Enter') { addApp(e.currentTarget.value); e.currentTarget.value = ''; } }} style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid #bae6fd' }} />
                                    <button onClick={() => { const el = document.getElementById('new-app-v196') as HTMLInputElement; addApp(el.value); el.value = ''; }} className="btn btn-primary" style={{ padding: '0 1.5rem' }}>Aggiungi</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {[...(editData.applications || [])]
                                        .map((app, idx) => ({ app, originalIdx: idx }))
                                        .sort((a, b) => (a.app.checked === b.app.checked ? 0 : a.app.checked ? -1 : 1))
                                        .map(({ app, originalIdx }, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: '0.4rem 0.6rem 0.4rem 1.1rem',
                                                    borderRadius: '12px',
                                                    backgroundColor: app.checked ? '#dcfce7' : '#fff',
                                                    color: app.checked ? '#166534' : '#475569',
                                                    border: `2px solid ${app.checked ? '#22c55e' : '#e2e8f0'}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                                                    onClick={() => toggleApp(originalIdx)}
                                                >
                                                    {app.checked ? <CheckCircle2 size={18} /> : <div style={{ width: 18, height: 18, border: '2px solid #cbd5e1', borderRadius: '4px' }}></div>}
                                                    {app.name}
                                                </div>

                                                {app.name.toLowerCase().includes('canali') && (
                                                    <input
                                                        type="number"
                                                        placeholder="Q.tà"
                                                        value={app.qty || ''}
                                                        onChange={(e) => updateAppQty(originalIdx, e.target.value)}
                                                        style={{ width: '60px', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                                                    />
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeApp(originalIdx); }}
                                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* Spazio Note Molto Ampio */}
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MessageSquare size={18} /> NOTE E OSSERVAZIONI TECNICHE
                                </label>
                                <textarea
                                    className="form-control"
                                    placeholder="Inserisci qui i commenti originali o le nuove note dell'amministrazione..."
                                    value={editData.comments || ''}
                                    onChange={e => setEditData(prev => ({ ...prev, comments: e.target.value }))}
                                    style={{
                                        minHeight: '280px',
                                        width: '100%',
                                        padding: '1.5rem',
                                        fontSize: '1rem',
                                        lineHeight: '1.6',
                                        borderRadius: '16px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#fff',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {/* Stati (Fatturato, Da collaudare, Collaudata) - SPOSTATI IN BASSO */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: editData.toTest ? 1 : 0.5 }}>
                                            <input type="checkbox" checked={editData.toTest || false} onChange={e => setEditData(prev => ({ ...prev, toTest: e.target.checked, tested: e.target.checked ? prev.tested : false }))} style={{ width: '28px', height: '28px' }} />
                                            <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}>🟡 DA COLLAUDARE</span>
                                        </label>
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: editData.tested ? 1 : 0.5 }}>
                                            <input type="checkbox" checked={editData.tested || false} onChange={e => setEditData(prev => ({ ...prev, tested: e.target.checked, toTest: e.target.checked ? true : prev.toTest }))} style={{ width: '28px', height: '28px' }} />
                                            <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.85rem' }}>🟢 COLLAUDATA</span>
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        <button
                                            onClick={() => setEditData(prev => ({ ...prev, isInvoiced: !prev.isInvoiced }))}
                                            style={{
                                                border: '2px solid',
                                                borderColor: editData.isInvoiced ? '#22c55e' : '#cbd5e1',
                                                backgroundColor: editData.isInvoiced ? '#dcfce7' : '#fff',
                                                color: editData.isInvoiced ? '#15803d' : '#475569',
                                                padding: '0.8rem 1.5rem',
                                                borderRadius: '12px',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                width: '100%',
                                                maxWidth: '300px',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <DollarSign size={22} /> {editData.isInvoiced ? 'FATTURATO' : 'SEGNA FATTURATO'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Azioni */}
                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '1rem' }}>
                            <button onClick={handleDelete} className="btn" style={{ backgroundColor: 'transparent', borderColor: '#ef4444', color: '#ef4444', padding: '0.5rem 1rem' }}>
                                <Trash2 size={18} /> {deleteConfirm ? 'Conferma eliminazione?' : 'Elimina scheda'}
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <button onClick={() => setSelectedInst(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Annulla</button>
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {saving ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
