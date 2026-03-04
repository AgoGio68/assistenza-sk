import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchInstallations } from '../services/InstallationService';
import { Installation } from '../types';
import { Truck, Calendar, Box, AlertTriangle, RefreshCw, X, Save, MessageSquare, Trash2, CheckCircle2, DollarSign, ListChecks, ArrowDownWideNarrow } from 'lucide-react';
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

    // Merge Sheet Data with Firestore Data
    useEffect(() => {
        const merged = sheetData.map(inst => {
            const extra = dbData[inst.orderNumber] || {};
            return {
                ...inst,
                ...extra,
                // Local overrides can specifically override fixed fields
                ...(extra.localOverrides || {})
            };
        }).filter(inst => !inst.isDeleted); // Client-side filtering of deleted items

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
            const docRef = doc(db, 'installation_data', selectedInst.orderNumber);
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
            const docRef = doc(db, 'installation_data', selectedInst.orderNumber);
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

        // Sorting apps: checked ones go move up if preferred, but user said "once checked they move to first position and change color"
        // Let's implement that logic upon toggling or rendering
        setEditData(prev => ({ ...prev, applications: newApps }));
    };

    const addApp = (name: string) => {
        if (!name.trim()) return;
        const newApps = [...(editData.applications || []), { name, checked: false }];
        setEditData(prev => ({ ...prev, applications: newApps }));
    };

    const getCardColor = (inst: Installation) => {
        if (inst.tested) return 'var(--success-color)'; // Green
        if (inst.toTest) return '#facc15'; // Yellow (Amber 400)
        return 'var(--secondary-color)'; // Blue (Default)
    };

    const sortedInstallations = [...installations]
        .filter(inst =>
            inst.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.serialSK.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.orderNumber.includes(searchTerm)
        )
        .sort((a, b) => {
            if (sortVerifiedAtBottom) {
                if (a.tested && !b.tested) return 1;
                if (!a.tested && b.tested) return -1;
            }
            return 0; // Maintain original order if same state or disabled
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
                        <span>Fine lista collaudate:</span>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {sortedInstallations.map((inst) => (
                        <div
                            key={inst.orderNumber}
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

            {/* Modal Evoluto v1.9.2 */}
            {selectedInst && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                        <button onClick={() => setSelectedInst(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={28} />
                        </button>

                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ color: 'var(--secondary-color)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase' }}>Dettaglio Ordine {selectedInst.orderNumber}</h4>
                                    <input
                                        type="text"
                                        value={editData.localOverrides?.client ?? selectedInst.client}
                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, client: e.target.value } }))}
                                        style={{ fontSize: '1.75rem', fontWeight: 700, background: 'none', border: 'none', borderBottom: '2px dashed #ccc', width: '100%', padding: '0.2rem 0' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setEditData(prev => ({ ...prev, isInvoiced: !prev.isInvoiced }))}
                                        className={`btn ${editData.isInvoiced ? 'btn-success' : ''}`}
                                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                        <DollarSign size={16} /> {editData.isInvoiced ? 'Fatturato' : 'Fattura'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            <div className="edit-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Dati Macchina</label>
                                <input
                                    className="form-control"
                                    value={editData.localOverrides?.machine ?? selectedInst.machine}
                                    onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, machine: e.target.value } }))}
                                    placeholder="Macchina" style={{ marginBottom: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        className="form-control"
                                        value={editData.localOverrides?.modelSK ?? selectedInst.modelSK}
                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, modelSK: e.target.value } }))}
                                        placeholder="Modello"
                                    />
                                    <input
                                        className="form-control"
                                        value={editData.localOverrides?.serialSK ?? selectedInst.serialSK}
                                        onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, serialSK: e.target.value } }))}
                                        placeholder="Matricola"
                                    />
                                </div>
                            </div>

                            <div className="edit-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pianificazione Installazione</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={editData.scheduledDate || selectedInst.deliveryDate}
                                        onChange={e => setEditData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                    />
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={editData.scheduledTime || ''}
                                        onChange={e => setEditData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                    />
                                </div>
                                <input
                                    className="form-control"
                                    value={editData.localOverrides?.installationSite ?? selectedInst.installationSite}
                                    onChange={e => setEditData(prev => ({ ...prev, localOverrides: { ...prev.localOverrides, installationSite: e.target.value } }))}
                                    placeholder="Sito di installazione" style={{ marginTop: '0.5rem' }}
                                />
                            </div>
                        </div>

                        {/* Stato Logica Colori */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={20} /> Stato Avanzamento
                            </h4>
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#b45309' }}>
                                    <input type="checkbox" checked={editData.toTest || false} onChange={e => setEditData(prev => ({ ...prev, toTest: e.target.checked, tested: e.target.checked ? prev.tested : false }))} style={{ width: '20px', height: '20px' }} />
                                    🟡 Da Collaudare
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#15803d' }}>
                                    <input type="checkbox" checked={editData.tested || false} onChange={e => setEditData(prev => ({ ...prev, tested: e.target.checked, toTest: e.target.checked ? true : prev.toTest }))} style={{ width: '20px', height: '20px' }} />
                                    🟢 Collaudata (Definitiva)
                                </label>
                            </div>
                        </div>

                        {/* Applicazioni Checklist */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ListChecks size={20} /> Applicazioni da aggiungere
                            </h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input id="new-app" type="text" className="form-control" placeholder="Nuova applicazione..." onKeyDown={e => { if (e.key === 'Enter') { addApp(e.currentTarget.value); e.currentTarget.value = ''; } }} />
                                <button onClick={() => { const el = document.getElementById('new-app') as HTMLInputElement; addApp(el.value); el.value = ''; }} className="btn btn-secondary">Aggiungi</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {[...(editData.applications || [])]
                                    .sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? -1 : 1))
                                    .map((app, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                const originalIdx = editData.applications!.findIndex(a => a.name === app.name);
                                                toggleApp(originalIdx);
                                            }}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '20px',
                                                backgroundColor: app.checked ? '#dcfce7' : '#f1f5f9',
                                                color: app.checked ? '#166534' : '#475569',
                                                border: `2px solid ${app.checked ? '#22c55e' : '#cbd5e1'}`,
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            {app.checked && <CheckCircle2 size={16} />}
                                            {app.name}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Commenti Extra */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Note Amministrazione</label>
                            <textarea
                                className="form-control"
                                value={editData.comments || ''}
                                onChange={e => setEditData(prev => ({ ...prev, comments: e.target.value }))}
                                style={{ minHeight: '100px' }}
                            />
                        </div>

                        {/* Footer Azioni */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={handleDelete} className="btn" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>
                                    <Trash2 size={18} /> {deleteConfirm ? 'Clicca ancora per eliminare' : 'Elimina scheda'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setSelectedInst(null)} className="btn btn-secondary">Annulla</button>
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {saving ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                                    Salva Tutto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
