import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

interface SettingsTabProps {
    localSettings: any;
    setLocalSettings: React.Dispatch<React.SetStateAction<any>>;
    onSaveSettings: (e: React.FormEvent) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    localSettings,
    setLocalSettings,
    onSaveSettings
}) => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Impostazioni Grafica e Brand</h3>
            <form onSubmit={onSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nome Applicazione</label>
                    <input type="text" value={localSettings.appName || ''} onChange={e => setLocalSettings((prev: any) => ({ ...prev, appName: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Colore Primario App (Barra superiore, headers)</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input type="color" value={localSettings.primaryColor || '#0f172a'} onChange={e => setLocalSettings((prev: any) => ({ ...prev, primaryColor: e.target.value }))} style={{ width: '50px', height: '50px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                        <span>{localSettings.primaryColor || '#0f172a'}</span>
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Colore Secondario (Pulsanti primari e testi evidenziati)</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input type="color" value={localSettings.secondaryColor || '#3b82f6'} onChange={e => setLocalSettings((prev: any) => ({ ...prev, secondaryColor: e.target.value }))} style={{ width: '50px', height: '50px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                        <span>{localSettings.secondaryColor || '#3b82f6'}</span>
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>URL Logo Identificativo (Opzionale)</label>
                    <input type="url" placeholder="https://es. immagine.png" value={localSettings.logoUrl || ''} onChange={e => setLocalSettings((prev: any) => ({ ...prev, logoUrl: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Lascia vuoto per usare il logo di default interno all'applicazione.</p>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                <h4 style={{ marginBottom: '1rem' }}>Preferenze Visibilità e Permessi</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visibilità Ticket per Utenti Non-Admin</label>
                        <select
                            value={localSettings.visibilityMode}
                            onChange={e => setLocalSettings((prev: any) => ({ ...prev, visibilityMode: e.target.value as any }))}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="all">Vedi tutti i ticket (Open/In Carico)</option>
                            <option value="assigned_only">Vedi solo i ticket assegnati a me</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Modalità Visualizzazione Ticket (PC/Tablet)</label>
                        <select
                            value={localSettings.layoutMode}
                            onChange={e => setLocalSettings((prev: any) => ({ ...prev, layoutMode: e.target.value as any }))}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="default">Lista Estesa (Standard)</option>
                            <option value="compact">Griglia Compatta (Riquadri cliccabili)</option>
                        </select>
                    </div>

                    {localSettings.layoutMode === 'compact' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="applyCompactToAll"
                                checked={localSettings.applyCompactToAll}
                                onChange={e => setLocalSettings((prev: any) => ({ ...prev, applyCompactToAll: e.target.checked }))}
                            />
                            <label htmlFor="applyCompactToAll" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Applica vista compatta anche agli utenti (non solo Admin)</label>
                        </div>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                <h4 style={{ marginBottom: '1rem', color: '#0369a1' }}>Funzionalità Extra: Caricamento Fotografie</h4>
                <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            id="enablePhotos"
                            checked={localSettings.enablePhotos || false}
                            onChange={e => setLocalSettings((prev: any) => ({ ...prev, enablePhotos: e.target.checked }))}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label htmlFor="enablePhotos" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0369a1', cursor: 'pointer' }}>
                            Abilita l'upload di fotografie nei ticket
                        </label>
                    </div>

                    {localSettings.enablePhotos && (
                        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                            <strong style={{ display: 'block', color: '#b91c1c', marginBottom: '0.5rem' }}>⚠️ ATTENZIONE: Costi Firebase Storage</strong>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d' }}>
                                Hai attivato il caricamento delle immagini. Firebase offre <strong>5 GB di spazio di archiviazione gratuito</strong> (Piano Spark).
                                Superata questa soglia, se non si passa a un piano a pagamento (Blaze), il caricamento verrà bloccato da Firebase.
                                <br /><br />
                                <em>Nota: Le immagini vengono compresse automaticamente in formato webP/JPEG ridotto prima dell'invio per massimizzare la resa dei 5 GB.</em>
                            </p>
                        </div>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                <h4 style={{ marginBottom: '1rem', color: '#b91c1c' }}>Gestione Sicurezza e Permessi Ruoli</h4>
                <div style={{ backgroundColor: '#fef2f2', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <h5 style={{ color: '#991b1b', marginBottom: '1rem' }}>Permessi Admin (Tecnici / Supervisori)</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="adminCanAssignAtCreation" checked={localSettings.adminCanAssignAtCreation !== false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, adminCanAssignAtCreation: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <label htmlFor="adminCanAssignAtCreation" style={{ cursor: 'pointer', fontWeight: 500, color: '#7f1d1d' }}>Permetti agli admin di assegnare testualmente a un collega il ticket durante la creazione</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="adminCanReassignOthers" checked={localSettings.adminCanReassignOthers || false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, adminCanReassignOthers: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <label htmlFor="adminCanReassignOthers" style={{ cursor: 'pointer', fontWeight: 500, color: '#7f1d1d' }}>Permetti agli admin di spodestare e spostare i ticket originariamente assegnati ad altri</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="adminCanCloseOthers" checked={localSettings.adminCanCloseOthers || false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, adminCanCloseOthers: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <label htmlFor="adminCanCloseOthers" style={{ cursor: 'pointer', fontWeight: 500, color: '#7f1d1d' }}>Permetti agli admin di chiudere coercitivamente i ticket in carico ad altri</label>
                        </div>
                    </div>

                    <h5 style={{ color: '#991b1b', marginBottom: '1rem' }}>Permessi Utenti Comuni (Senza Privilegi)</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="userCanAssignAtCreation" checked={localSettings.userCanAssignAtCreation || false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, userCanAssignAtCreation: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <label htmlFor="userCanAssignAtCreation" style={{ cursor: 'pointer', fontWeight: 500, color: '#7f1d1d' }}>Permetti esplicitamente anche a loro di pre-assegnare il ticket creato a un tecnico</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="userCanCloseOwnTickets" checked={localSettings.userCanCloseOwnTickets !== false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, userCanCloseOwnTickets: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <label htmlFor="userCanCloseOwnTickets" style={{ cursor: 'pointer', fontWeight: 500, color: '#7f1d1d' }}>Permetti loro di indicare e chiudere autonomamente l'esito dei propri ticket aperti</label>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                <h4 style={{ marginBottom: '1rem', color: '#047857' }}>Gestione Installazioni (Google Sheets)</h4>
                <div style={{ backgroundColor: '#ecfdf5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            id="enableInstallations"
                            checked={localSettings.enableInstallations || false}
                            onChange={e => setLocalSettings((prev: any) => ({ ...prev, enableInstallations: e.target.checked }))}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label htmlFor="enableInstallations" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#047857', cursor: 'pointer' }}>
                            Abilita la sezione Installazioni
                        </label>
                    </div>

                    {localSettings.enableInstallations && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#065f46' }}>URL Foglio Google (Eseguibile/CSV)</label>
                                <input
                                    type="url"
                                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                                    value={localSettings.installationsSheetUrl || ''}
                                    onChange={e => setLocalSettings((prev: any) => ({ ...prev, installationsSheetUrl: e.target.value }))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #6ee7b7' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '0.5rem' }}>
                                    Assicurati che il foglio sia condiviso con "Chiunque abbia il link può visualizzare".
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#065f46' }}>Prefisso Matricola (Opzionale)</label>
                                <input
                                    type="text"
                                    placeholder="Es. SK-, MAC-, ecc."
                                    value={localSettings.serialPrefix || ''}
                                    onChange={e => setLocalSettings((prev: any) => ({ ...prev, serialPrefix: e.target.value }))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #6ee7b7' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '0.5rem' }}>
                                    Questo testo verrà mostrato in modo fisso davanti al campo matricola nel dettaglio installazione.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1.5rem' }}>
                    <SettingsIcon size={18} /> Salva e Applica Globalmente
                </button>
            </form>
        </div>
    );
};
