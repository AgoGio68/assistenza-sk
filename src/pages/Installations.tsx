import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchInstallations } from '../services/InstallationService';
import { Installation } from '../types';
import { Truck, Calendar, Box, Info, AlertTriangle, RefreshCw, X, Save, MessageSquare } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Installations: React.FC = () => {
    const { settings } = useSettings();
    const { isSuperadmin, isAdmin } = useAuth();
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Note State
    const [selectedInst, setSelectedInst] = useState<Installation | null>(null);
    const [extraNote, setExtraNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [dbNotes, setDbNotes] = useState<Record<string, string>>({});

    const loadData = async () => {
        if (!settings.installationsSheetUrl) {
            setError("URL del foglio Google non configurato nel pannello Admin.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await fetchInstallations(settings.installationsSheetUrl);
            setInstallations(data);
        } catch (err) {
            setError("Impossibile caricare i dati dal foglio. Verifica che l'URL sia corretto e il foglio sia pubblico.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [settings.installationsSheetUrl]);

    const handleOpenDetail = async (inst: Installation) => {
        setSelectedInst(inst);
        setExtraNote('');

        // Fetch extra note from Firestore
        try {
            const noteRef = doc(db, 'installation_notes', inst.orderNumber);
            const noteSnap = await getDoc(noteRef);
            if (noteSnap.exists()) {
                const data = noteSnap.data();
                setExtraNote(data.note || '');
                setDbNotes(prev => ({ ...prev, [inst.orderNumber]: data.note || '' }));
            }
        } catch (err) {
            console.error("Error fetching note:", err);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedInst) return;

        setSavingNote(true);
        try {
            const noteRef = doc(db, 'installation_notes', selectedInst.orderNumber);
            await setDoc(noteRef, {
                note: extraNote,
                updatedAt: Date.now(),
                updatedBy: 'admin'
            }, { merge: true });

            setDbNotes(prev => ({ ...prev, [selectedInst.orderNumber]: extraNote }));
            alert("Nota salvata correttamente!");
        } catch (err) {
            console.error("Error saving note:", err);
            alert("Errore durante il salvataggio.");
        } finally {
            setSavingNote(false);
        }
    };

    const filteredInstallations = installations.filter(inst =>
        inst.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.serialSK.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <h2 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={28} /> Gestione Installazioni
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Pianificazione e monitoraggio nuove installazioni da Google Sheets
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="btn"
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    Aggiorna Dati
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Cerca per cliente, macchina o matricola..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '1rem'
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={40} className="spin" style={{ color: 'var(--secondary-color)', marginBottom: '1rem' }} />
                    <p>Caricamento dati dal foglio Google...</p>
                </div>
            ) : error ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--danger-color)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{error}</p>
                    {(isAdmin || isSuperadmin) && (
                        <p style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                            Controlla le impostazioni nel Pannello Admin.
                        </p>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem'
                }}>
                    {filteredInstallations.length > 0 ? (
                        filteredInstallations.map((inst, index) => (
                            <div
                                key={index}
                                onClick={() => handleOpenDetail(inst)}
                                className="glass-panel card-hover"
                                style={{
                                    padding: '1.25rem',
                                    borderLeft: `5px solid ${inst.installDate ? 'var(--success-color)' : 'var(--secondary-color)'}`,
                                    position: 'relative',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary-color)' }}>{inst.client}</h3>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '999px',
                                        backgroundColor: inst.installDate ? '#dcfce7' : '#dbeafe',
                                        color: inst.installDate ? '#166534' : '#1e40af',
                                        fontWeight: 700
                                    }}>
                                        {inst.installDate ? 'INSTALLATA' : 'DA CONSEGNARE'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Box size={16} style={{ color: 'var(--text-secondary)' }} />
                                        <span><strong>Macchina:</strong> {inst.machine}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                                        <span><strong>Consegna:</strong> {inst.deliveryDate || 'N/D'}</span>
                                    </div>
                                </div>
                                <div style={{
                                    marginTop: '1rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>Ordine N° {inst.orderNumber}</span>
                                    {dbNotes[inst.orderNumber] && (
                                        <MessageSquare size={14} style={{ color: 'var(--secondary-color)' }} />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                            <p>Nessuna installazione trovata per i criteri di ricerca.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {selectedInst && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div className="glass-panel" style={{
                        width: '100%', maxWidth: '700px', maxHeight: '90vh',
                        overflowY: 'auto', padding: '2rem', position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <button
                            onClick={() => setSelectedInst(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={28} />
                        </button>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', fontWeight: 700, textTransform: 'uppercase' }}>Dettaglio Installazione</span>
                            <h2 style={{ margin: '0.5rem 0', color: 'var(--primary-color)' }}>{selectedInst.client}</h2>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '4px',
                                    backgroundColor: '#f1f5f9', color: '#475569'
                                }}>
                                    Ordine: {selectedInst.orderNumber}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div className="info-group">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Dati Macchina</label>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                                    <Box size={16} style={{ marginRight: '0.5rem' }} /> {selectedInst.machine}
                                </div>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    Modello: {selectedInst.modelSK}
                                </div>
                                <div style={{ fontSize: '0.9rem' }}>
                                    Matricola: {selectedInst.serialSK}
                                </div>
                            </div>

                            <div className="info-group">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Pianificazione</label>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                                    <Calendar size={16} style={{ marginRight: '0.5rem' }} /> Consegna: {selectedInst.deliveryDate || 'N/D'}
                                </div>
                                {selectedInst.installDate && (
                                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--success-color)', fontWeight: 600 }}>
                                        Installata: {selectedInst.installDate}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    Sito: {selectedInst.installationSite || 'N/D'}
                                </div>
                            </div>
                        </div>

                        {selectedInst.comments && (
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Commenti Originali (Google Sheets)</label>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                    {selectedInst.comments}
                                </div>
                            </div>
                        )}

                        {(isAdmin || isSuperadmin) && (
                            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
                                    <MessageSquare size={20} /> Note Extra Amministrazione
                                </h4>
                                <textarea
                                    value={extraNote}
                                    onChange={(e) => setExtraNote(e.target.value)}
                                    placeholder="Inserisci qui note aggiuntive visibili solo internamente..."
                                    style={{
                                        width: '100%',
                                        minHeight: '120px',
                                        padding: '1rem',
                                        borderRadius: 'var(--border-radius-md)',
                                        border: '1px solid var(--border-color)',
                                        marginBottom: '1rem',
                                        fontSize: '0.95rem',
                                        resize: 'vertical'
                                    }}
                                />
                                <button
                                    onClick={handleSaveNote}
                                    disabled={savingNote}
                                    className="btn btn-primary"
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    {savingNote ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                                    Salva Note Extra
                                </button>
                            </div>
                        )}

                        {(!isAdmin && !isSuperadmin) && dbNotes[selectedInst.orderNumber] && (
                            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
                                    <MessageSquare size={20} /> Note Extra Amministrazione
                                </h4>
                                <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.9rem' }}>
                                    {dbNotes[selectedInst.orderNumber]}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
