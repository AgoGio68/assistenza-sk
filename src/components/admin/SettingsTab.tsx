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
            <form onSubmit={onSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>

                {/* 1. Impostazioni Grafica e Brand */}
                <div>
                    <h3 style={{ marginBottom: '1rem' }}>Impostazioni Grafica e Brand</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
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
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0' }} />

                {/* 2. Preferenze Visibilità e Permessi */}
                <div>
                    <h4 style={{ marginBottom: '1rem' }}>Preferenze Visibilità e Permessi</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
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

                            {localSettings.layoutMode === 'compact' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
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
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 3. Funzionalità Extra: Caricamento Fotografie */}
                <h4 style={{ margin: '0', color: '#0ea5e9' }}>Funzionalità Extra: Caricamento Fotografie</h4>
                <div style={{ background: 'rgba(56,189,248,0.06)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            id="enablePhotos"
                            checked={localSettings.enablePhotos || false}
                            onChange={e => setLocalSettings((prev: any) => ({ ...prev, enablePhotos: e.target.checked }))}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label htmlFor="enablePhotos" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#38bdf8', cursor: 'pointer' }}>
                            Abilita l'upload di fotografie nei ticket
                        </label>
                    </div>

                    {localSettings.enablePhotos && (
                        <div style={{ background: 'rgba(244,63,94,0.08)', borderLeft: '4px solid var(--danger-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginTop: '1rem' }}>
                            <strong style={{ display: 'block', color: 'var(--danger-color)', marginBottom: '0.5rem' }}>⚠️ ATTENZIONE: Costi Firebase Storage</strong>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Hai attivato il caricamento delle immagini. Firebase offre <strong>5 GB di spazio di archiviazione gratuito</strong> (Piano Spark).
                                Superata questa soglia, se non si passa a un piano a pagamento (Blaze), il caricamento verrà bloccato da Firebase.
                                <br /><br />
                                <em>Nota: Le immagini vengono compresse automaticamente in formato webP/JPEG ridotto prima dell'invio per massimizzare la resa dei 5 GB.</em>
                            </p>
                        </div>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 4. Gestione Sicurezza e Permessi Ruoli */}
                <h4 style={{ margin: '0', color: 'var(--danger-color)' }}>Gestione Sicurezza e Permessi Ruoli</h4>
                <div style={{ background: 'rgba(244,63,94,0.06)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(244,63,94,0.2)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h5 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>Permessi Admin (Tecnici / Supervisori)</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="adminCanAssignAtCreation" checked={localSettings.adminCanAssignAtCreation !== false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, adminCanAssignAtCreation: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <label htmlFor="adminCanAssignAtCreation" style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}>Permetti agli admin di assegnare testualmente a un collega il ticket durante la creazione</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="adminCanReassignOthers" checked={localSettings.adminCanReassignOthers || false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, adminCanReassignOthers: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <label htmlFor="adminCanReassignOthers" style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}>Permetti agli admin di spodestare e spostare i ticket originariamente assegnati ad altri</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="adminCanCloseOthers" checked={localSettings.adminCanCloseOthers || false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, adminCanCloseOthers: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <label htmlFor="adminCanCloseOthers" style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}>Permetti agli admin di chiudere coercitivamente i ticket in carico ad altri</label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h5 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>Permessi Utenti Comuni (Senza Privilegi)</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="userCanAssignAtCreation" checked={localSettings.userCanAssignAtCreation || false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, userCanAssignAtCreation: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <label htmlFor="userCanAssignAtCreation" style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}>Permetti esplicitamente anche a loro di pre-assegnare il ticket creato a un tecnico</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="userCanCloseOwnTickets" checked={localSettings.userCanCloseOwnTickets !== false} onChange={e => setLocalSettings((prev: any) => ({ ...prev, userCanCloseOwnTickets: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <label htmlFor="userCanCloseOwnTickets" style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}>Permetti loro di indicare e chiudere autonomamente l'esito dei propri ticket aperti</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 5. Gestione Installazioni (Google Sheets) */}
                <h4 style={{ margin: '0', color: 'var(--success-color)' }}>Gestione Installazioni (Google Sheets)</h4>
                <div style={{ background: 'rgba(16,185,129,0.06)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            id="enableInstallations"
                            checked={localSettings.enableInstallations || false}
                            onChange={e => setLocalSettings((prev: any) => ({ ...prev, enableInstallations: e.target.checked }))}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label htmlFor="enableInstallations" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success-color)', cursor: 'pointer' }}>
                            Abilita la sezione Installazioni
                        </label>
                    </div>

                    {localSettings.enableInstallations && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--success-color)' }}>URL Foglio Google (Eseguibile/CSV)</label>
                                <input
                                    type="url"
                                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                                    value={localSettings.installationsSheetUrl || ''}
                                    onChange={e => setLocalSettings((prev: any) => ({ ...prev, installationsSheetUrl: e.target.value }))}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Assicurati che il foglio sia condiviso con "Chiunque abbia il link può visualizzare".
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--success-color)' }}>Prefisso Matricola (Opzionale)</label>
                                <input
                                    type="text"
                                    placeholder="Es. SK-, MAC-, ecc."
                                    value={localSettings.serialPrefix || ''}
                                    onChange={e => setLocalSettings((prev: any) => ({ ...prev, serialPrefix: e.target.value }))}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Questo testo verrà mostrato in modo fisso davanti al campo matricola nel dettaglio installazione.
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--success-color)' }}>Lista Moduli Attivabili (Uno per riga)</label>
                                <textarea
                                    placeholder="Es:&#10;OCMSKD20101 - Upgrade 1&#10;OCMSKD20202 - Multiple tool..."
                                    value={Array.isArray(localSettings.installationModules) ? localSettings.installationModules.join('\n') : ''}
                                    onChange={e => {
                                        setLocalSettings((prev: any) => ({ ...prev, installationModules: e.target.value.split('\n') }));
                                    }}
                                    style={{ width: '100%', padding: '0.75rem', minHeight: '130px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Inserisci un modulo per ogni riga. Verranno visualizzati come checklist nel Dettaglio Installazione. Le righe vuote verranno ignorate al salvataggio.
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
