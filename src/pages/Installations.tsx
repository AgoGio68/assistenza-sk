import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchInstallations } from '../services/InstallationService';
import { Installation } from '../types';
import { Truck, Calendar, Box, Info, AlertTriangle, RefreshCw } from 'lucide-react';

export const Installations: React.FC = () => {
    const { settings } = useSettings();
    const { isSuperadmin } = useAuth();
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
                    {isSuperadmin && (
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
                            <div key={index} className="glass-panel card-hover" style={{
                                padding: '1.25rem',
                                borderLeft: `5px solid ${inst.installDate ? 'var(--success-color)' : 'var(--secondary-color)'}`,
                                position: 'relative'
                            }}>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Info size={16} style={{ color: 'var(--text-secondary)' }} />
                                        <span><strong>Modello:</strong> {inst.modelSK} ({inst.serialSK})</span>
                                    </div>

                                    {inst.installDate && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', fontWeight: 600 }}>
                                            <Calendar size={16} />
                                            <span>Installata il: {inst.installDate}</span>
                                        </div>
                                    )}

                                    {inst.comments && (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-main)',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <strong>Note:</strong> {inst.comments}
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    marginTop: '1rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'right'
                                }}>
                                    Ordine N° {inst.orderNumber}
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
        </div>
    );
};
