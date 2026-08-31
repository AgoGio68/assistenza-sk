import React from 'react';
import { Settings as SettingsIcon, Globe, Database, Download } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { StorageQuotaWidget } from './StorageQuotaWidget';

interface SettingsTabProps {
    localSettings: any;
    setLocalSettings: React.Dispatch<React.SetStateAction<any>>;
    onSaveSettings: (e: React.FormEvent) => Promise<void>;
    waStats?: { count: number; lastMonth: string } | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    localSettings,
    setLocalSettings,
    onSaveSettings,
}) => {
    const { t } = useLanguage();


    return (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Monitoraggio Spazio & Quota Piano Gratuito (Firebase Spark) */}
            <StorageQuotaWidget />

            <form
                onSubmit={onSaveSettings}
                style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}
            >
                {/* Backup di Emergenza (CSV) - SPOSTATO IN CIMA PER VISIBILITÀ */}

                <div
                    style={{
                        background: 'rgba(245,158,11,0.08)',
                        padding: '1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        marginBottom: '1rem'
                    }}
                >
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database size={20} /> 🚨 BACKUP DI EMERGENZA (Export CSV)
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        Scarica tutti i dati di <strong>Ordini</strong> e <strong>Checklist</strong> in formato CSV universale.
                    </p>
                    
                    <button
                        type="button"
                        className="btn"
                        onClick={async () => {
                            const btn = document.activeElement as HTMLButtonElement;
                            const originalText = btn.innerHTML;
                            btn.innerHTML = '<span class="spinner"></span> Generazione...';
                            btn.disabled = true;

                            try {
                                // 1. Export ORDINI
                                const qOrdini = collection(db, 'ordini');
                                const snapOrdini = await getDocs(qOrdini);
                                if (!snapOrdini.empty) {
                                    const allData = snapOrdini.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                    const keys = Array.from(new Set(allData.flatMap(d => Object.keys(d))));
                                    const csvRows = [keys.join(',')];
                                    allData.forEach(row => {
                                        const values = keys.map(k => {
                                            const val = (row as any)[k];
                                            const str = typeof val === 'object' ? JSON.stringify(val) : String(val || '');
                                            return `"${str.replace(/"/g, '""')}"`;
                                        });
                                        csvRows.push(values.join(','));
                                    });
                                    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `backup_ordini_completo_${new Date().toISOString().split('T')[0]}.csv`;
                                    link.click();
                                }

                                // 2. Export COLLAUDO_CHECKLISTS
                                const qCheck = collection(db, 'collaudo_checklists');
                                const snapCheck = await getDocs(qCheck);
                                if (!snapCheck.empty) {
                                    const allData = snapCheck.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                    const keys = Array.from(new Set(allData.flatMap(d => Object.keys(d))));
                                    const csvRows = [keys.join(',')];
                                    allData.forEach(row => {
                                        const values = keys.map(k => {
                                            const val = (row as any)[k];
                                            const str = typeof val === 'object' ? JSON.stringify(val) : String(val || '');
                                            return `"${str.replace(/"/g, '""')}"`;
                                        });
                                        csvRows.push(values.join(','));
                                    });
                                    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `backup_checklists_completo_${new Date().toISOString().split('T')[0]}.csv`;
                                    link.click();
                                }
                                alert('Backup generato con successo!');
                            } catch (error: any) {
                                console.error('Backup Error:', error);
                                alert('Errore backup: ' + error.message);
                            } finally {
                                btn.innerHTML = originalText;
                                btn.disabled = false;
                            }
                        }}
                        style={{
                            background: '#f59e0b',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            fontWeight: 800,
                            padding: '0.8rem 1.6rem',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
                        }}
                    >
                        <Download size={18} /> SCARICA BACKUP COMPLETO (CSV)
                    </button>
                </div>
                {/* 1. Impostazioni Grafica e Brand */}
                <div>
                    <h3 style={{ marginBottom: '1rem' }}>Impostazioni Grafica e Brand</h3>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Nome Applicazione
                            </label>
                            <input
                                type="text"
                                value={localSettings.appName || ''}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({ ...prev, appName: e.target.value }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Colore Primario App (Barra superiore, headers)
                            </label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={localSettings.primaryColor || '#0f172a'}
                                    onChange={(e) =>
                                        setLocalSettings((prev: any) => ({ ...prev, primaryColor: e.target.value }))
                                    }
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        padding: 0,
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                    }}
                                />
                                <span>{localSettings.primaryColor || '#0f172a'}</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Colore Secondario (Pulsanti primari e testi evidenziati)
                            </label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={localSettings.secondaryColor || '#3b82f6'}
                                    onChange={(e) =>
                                        setLocalSettings((prev: any) => ({ ...prev, secondaryColor: e.target.value }))
                                    }
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        padding: 0,
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                    }}
                                />
                                <span>{localSettings.secondaryColor || '#3b82f6'}</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                URL Logo Identificativo (Opzionale)
                            </label>
                            <input
                                type="text"
                                placeholder="https://es. immagine.png"
                                value={localSettings.logoUrl || ''}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({ ...prev, logoUrl: e.target.value }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Lascia vuoto per usare il logo di default interno all'applicazione.
                            </p>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 1A. Language Settings */}
                <div>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={20} color="var(--primary-color)" /> {t('settings.language.title')}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        {t('settings.language.subtitle')}
                    </p>
                    <div style={{ maxWidth: '400px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            {t('settings.language.default')}
                        </label>
                        <select
                            value={localSettings.language || 'it'}
                            onChange={(e) =>
                                setLocalSettings((prev: any) => ({ ...prev, language: e.target.value }))
                            }
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                            }}
                        >
                            <option value="it">🇮🇹 Italiano</option>
                            <option value="en">🇬🇧 English</option>
                            <option value="fr">🇫🇷 Français</option>
                        </select>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 1b. Colori Icone Navigazione (v3.9.1) */}
                <div>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🎨 Colori Icone Navigazione
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Personalizza il colore di ogni icona nella barra di navigazione superiore (Mobile & Desktop).
                    </p>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        {[
                            { id: 'dashboard', label: 'Dashboard' },
                            { id: 'calendar', label: 'Calendario' },
                            { id: 'tickets', label: 'Ticket SK' },
                            { id: 'installations', label: 'Installazioni' },
                            { id: 'profile', label: 'Profilo/Statistiche' },
                            { id: 'create', label: 'Nuovo Ticket' },
                            { id: 'admin', label: 'Pannello Admin' },
                            { id: 'rapportini', label: 'Rapportini' },
                            { id: 'logout', label: 'Logout' },
                        ].map((item) => (
                            <div key={item.id}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {item.label}
                                </label>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={localSettings.navIconColors?.[item.id] || '#6366f1'}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                navIconColors: {
                                                    ...(prev.navIconColors || {}),
                                                    [item.id]: e.target.value,
                                                },
                                            }))
                                        }
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            padding: 0,
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                        {localSettings.navIconColors?.[item.id] || '#6366f1'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 2. Preferenze Visibilità e Permessi */}
                <div>
                    <h4 style={{ marginBottom: '1rem' }}>Preferenze Visibilità e Permessi</h4>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Visibilità Ticket per Utenti Non-Admin
                            </label>
                            <select
                                value={localSettings.visibilityMode}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({
                                        ...prev,
                                        visibilityMode: e.target.value as any,
                                    }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                }}
                            >
                                <option value="all">Vedi tutti i ticket (Open/In Carico)</option>
                                <option value="assigned_only">Vedi solo i ticket assegnati a me</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Modalità Visualizzazione Ticket (PC/Tablet)
                            </label>
                            <select
                                value={localSettings.layoutMode}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({ ...prev, layoutMode: e.target.value as any }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                }}
                            >
                                <option value="default">Lista Estesa (Standard)</option>
                                <option value="compact">Griglia Compatta (Riquadri cliccabili)</option>
                            </select>

                            {localSettings.layoutMode === 'compact' && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginTop: '0.75rem',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="applyCompactToAll"
                                        checked={localSettings.applyCompactToAll}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                applyCompactToAll: e.target.checked,
                                            }))
                                        }
                                    />
                                    <label
                                        htmlFor="applyCompactToAll"
                                        style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                                    >
                                        Applica vista compatta anche agli utenti (non solo Admin)
                                    </label>
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Modalità Visualizzazione Installazioni
                            </label>
                            <select
                                value={localSettings.installationsLayoutMode || 'default'}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({
                                        ...prev,
                                        installationsLayoutMode: e.target.value as any,
                                    }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                }}
                            >
                                <option value="default">Griglia Estesa (Riquadri attuali)</option>
                                <option value="grid-compact">Griglia Compatta (Riquadri piccoli)</option>
                                <option value="list">Lista Compatta (Riga singola)</option>
                                <option value="list-2col">Lista Compatta (2 Colonne)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 3. Funzionalità Extra: Caricamento Fotografie */}
                <h4 style={{ margin: '0', color: '#0ea5e9' }}>Funzionalità Extra: Caricamento Fotografie</h4>
                <div
                    style={{
                        background: 'rgba(56,189,248,0.06)',
                        padding: '1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(56,189,248,0.2)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            id="enablePhotos"
                            checked={localSettings.enablePhotos || false}
                            onChange={(e) =>
                                setLocalSettings((prev: any) => ({ ...prev, enablePhotos: e.target.checked }))
                            }
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label
                            htmlFor="enablePhotos"
                            style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#38bdf8', cursor: 'pointer' }}
                        >
                            Abilita l'upload di fotografie nei ticket
                        </label>
                    </div>

                    {localSettings.enablePhotos && (
                        <div
                            style={{
                                background: 'rgba(244,63,94,0.08)',
                                borderLeft: '4px solid var(--danger-color)',
                                padding: '1rem',
                                borderRadius: 'var(--border-radius-sm)',
                                marginTop: '1rem',
                            }}
                        >
                            <strong style={{ display: 'block', color: 'var(--danger-color)', marginBottom: '0.5rem' }}>
                                ⚠️ ATTENZIONE: Costi Firebase Storage
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Hai attivato il caricamento delle immagini. Firebase offre{' '}
                                <strong>5 GB di spazio di archiviazione gratuito</strong> (Piano Spark). Superata questa
                                soglia, se non si passa a un piano a pagamento (Blaze), il caricamento verrà bloccato da
                                Firebase.
                                <br />
                                <br />
                                <em>
                                    Nota: Le immagini vengono compresse automaticamente in formato webP/JPEG ridotto
                                    prima dell'invio per massimizzare la resa dei 5 GB.
                                </em>
                            </p>
                        </div>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 4. Gestione Sicurezza e Permessi Ruoli */}
                <h4 style={{ margin: '0', color: 'var(--danger-color)' }}>Gestione Sicurezza e Permessi Ruoli</h4>
                <div
                    style={{
                        background: 'rgba(244,63,94,0.06)',
                        padding: '1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(244,63,94,0.2)',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                            gap: '2rem',
                        }}
                    >
                        <div>
                            <h5 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>
                                Permessi Admin (Tecnici / Supervisori)
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="adminCanAssignAtCreation"
                                        checked={localSettings.adminCanAssignAtCreation !== false}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                adminCanAssignAtCreation: e.target.checked,
                                            }))
                                        }
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label
                                        htmlFor="adminCanAssignAtCreation"
                                        style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}
                                    >
                                        Permetti agli admin di assegnare testualmente a un collega il ticket durante la
                                        creazione
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="adminCanReassignOthers"
                                        checked={localSettings.adminCanReassignOthers || false}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                adminCanReassignOthers: e.target.checked,
                                            }))
                                        }
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label
                                        htmlFor="adminCanReassignOthers"
                                        style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}
                                    >
                                        Permetti agli admin di spodestare e spostare i ticket originariamente assegnati
                                        ad altri
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="adminCanCloseOthers"
                                        checked={localSettings.adminCanCloseOthers || false}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                adminCanCloseOthers: e.target.checked,
                                            }))
                                        }
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label
                                        htmlFor="adminCanCloseOthers"
                                        style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}
                                    >
                                        Permetti agli admin di chiudere coercitivamente i ticket in carico ad altri
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h5 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>
                                Permessi Utenti Comuni (Senza Privilegi)
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="userCanAssignAtCreation"
                                        checked={localSettings.userCanAssignAtCreation || false}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                userCanAssignAtCreation: e.target.checked,
                                            }))
                                        }
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label
                                        htmlFor="userCanAssignAtCreation"
                                        style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}
                                    >
                                        Permetti esplicitamente anche a loro di pre-assegnare il ticket creato a un
                                        tecnico
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="userCanCloseOwnTickets"
                                        checked={localSettings.userCanCloseOwnTickets !== false}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                userCanCloseOwnTickets: e.target.checked,
                                            }))
                                        }
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label
                                        htmlFor="userCanCloseOwnTickets"
                                        style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}
                                    >
                                        Permetti loro di indicare e chiudere autonomamente l'esito dei propri ticket
                                        aperti
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                <h4 style={{ margin: '0', color: 'var(--success-color)' }}>Gestione Installazioni</h4>
                <div
                    style={{
                        background: 'rgba(16,185,129,0.06)',
                        padding: '1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(16,185,129,0.2)',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: 600,
                                    color: 'var(--success-color)',
                                }}
                            >
                                Prefisso Matricola (Opzionale)
                            </label>
                            <input
                                type="text"
                                placeholder="Es. SK-, MAC-, ecc."
                                value={localSettings.serialPrefix || ''}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({ ...prev, serialPrefix: e.target.value }))
                                }
                                style={{ width: '100%', padding: '0.75rem' }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Questo testo verrà mostrato davanti al campo matricola nel dettaglio installazione.
                            </p>
                        </div>
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: 600,
                                    color: 'var(--success-color)',
                                }}
                            >
                                Lista Moduli Attivabili (Uno per riga)
                            </label>
                            <textarea
                                placeholder="Es:&#10;OCMSKD20101 - Upgrade 1&#10;OCMSKD20202 - Multiple tool..."
                                value={
                                    Array.isArray(localSettings.installationModules)
                                        ? localSettings.installationModules.join('\n')
                                        : ''
                                }
                                onChange={(e) => {
                                    setLocalSettings((prev: any) => ({
                                        ...prev,
                                        installationModules: e.target.value.split('\n'),
                                    }));
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    minHeight: '130px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    resize: 'vertical',
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Inserisci un modulo per ogni riga. Verranno visualizzati come checklist nel
                                Dettaglio Installazione. Le righe vuote verranno ignorate al salvataggio.
                            </p>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 6. Gestione Seconda Sezione Assistenza (v3.0.0) */}
                <h4 style={{ margin: '0', color: 'var(--accent-teal)' }}>Gestione Seconda Sezione Assistenza</h4>
                <div
                    style={{
                        background: 'rgba(45,212,191,0.06)',
                        padding: '1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(45,212,191,0.2)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            id="section2Enabled"
                            checked={localSettings.section2Enabled || false}
                            onChange={(e) =>
                                setLocalSettings((prev: any) => ({ ...prev, section2Enabled: e.target.checked }))
                            }
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label
                            htmlFor="section2Enabled"
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                color: 'var(--accent-teal)',
                                cursor: 'pointer',
                            }}
                        >
                            Abilita una Seconda Sezione (Tickets separati)
                        </label>
                    </div>

                    {localSettings.section2Enabled && (
                        <>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                    gap: '1.5rem',
                                    marginTop: '1rem',
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 600,
                                            color: 'var(--accent-teal)',
                                        }}
                                    >
                                        Nome Sezione (Es. Assistenza SK 2)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Es. Assistenza Macchine X"
                                        value={localSettings.section2Name || ''}
                                        onChange={(e) =>
                                            setLocalSettings((prev: any) => ({ ...prev, section2Name: e.target.value }))
                                        }
                                        style={{ width: '100%', padding: '0.75rem' }}
                                    />
                                    <p
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            marginTop: '0.5rem',
                                        }}
                                    >
                                        Questo nome apparirà nel menu laterale per gli utenti abilitati.
                                    </p>
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 600,
                                            color: 'var(--accent-teal)',
                                        }}
                                    >
                                        Colore Distintivo Sezione (Badge/Bottoni)
                                    </label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <input
                                            type="color"
                                            value={localSettings.section2Color || '#f59e0b'}
                                            onChange={(e) =>
                                                setLocalSettings((prev: any) => ({
                                                    ...prev,
                                                    section2Color: e.target.value,
                                                }))
                                            }
                                            style={{
                                                width: '50px',
                                                height: '50px',
                                                padding: 0,
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                            }}
                                        />
                                        <span>{localSettings.section2Color || '#f59e0b'}</span>
                                    </div>
                                </div>
                            </div>

                            <hr
                                style={{
                                    border: 'none',
                                    borderTop: '1px solid rgba(45,212,191,0.2)',
                                    margin: '1.5rem 0',
                                }}
                            />

                            <h5 style={{ color: 'var(--accent-teal)', marginBottom: '1rem', fontSize: '1.05rem' }}>
                                Installazioni per la Seconda Sezione
                            </h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    type="checkbox"
                                    id="section2InstallationsEnabled"
                                    checked={localSettings.section2InstallationsEnabled || false}
                                    onChange={(e) =>
                                        setLocalSettings((prev: any) => ({
                                            ...prev,
                                            section2InstallationsEnabled: e.target.checked,
                                        }))
                                    }
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                                <label
                                    htmlFor="section2InstallationsEnabled"
                                    style={{
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        color: 'var(--accent-teal)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Abilita vista Installazioni separata per questa Sezione
                                </label>
                            </div>

                            {localSettings.section2InstallationsEnabled && (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                        gap: '1.5rem',
                                        marginTop: '1rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(45,212,191,0.2)',
                                        }}
                                    >
                                        <h6
                                            style={{
                                                color: 'var(--accent-teal)',
                                                marginBottom: '0.75rem',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            Visibilità Campi nel Dettaglio (Sezione 2)
                                        </h6>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                gap: '0.75rem',
                                            }}
                                        >
                                            {[
                                                { id: 'showModelSK', label: 'Modello SK' },
                                                { id: 'showSerialSK', label: 'Matricola' },
                                                { id: 'showOrderNumber', label: 'N. Ordine Principale' },
                                                { id: 'showOrderDfv', label: 'N. Ordine DFV' },
                                                { id: 'showPlanning', label: 'Pianificazione (Data/Ora/Sito)' },
                                                { id: 'showModules', label: 'Moduli da Attivare' },
                                                { id: 'showExtractedNotes', label: 'Componenti Estratti' },
                                                { id: 'showTechnicalNotes', label: 'Note Tecniche' },
                                            ].map((field) => (
                                                <div
                                                    key={field.id}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={field.id}
                                                        /* @ts-ignore */
                                                        checked={
                                                            localSettings.section2InstallationsFields?.[field.id] !==
                                                            false
                                                        }
                                                        onChange={(e) =>
                                                            setLocalSettings((prev: any) => ({
                                                                ...prev,
                                                                section2InstallationsFields: {
                                                                    ...(prev.section2InstallationsFields || {}),
                                                                    [field.id]: e.target.checked,
                                                                },
                                                            }))
                                                        }
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                    <label
                                                        htmlFor={field.id}
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        {field.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0' }} />

                {/* 7. Gestione Magazzino (v3.6.0) */}
                <h4 style={{ margin: '0', color: 'var(--primary-color)' }}>📦 Gestione Magazzino e Inventario</h4>
                <div
                    style={{
                        background: 'rgba(99,102,241,0.06)',
                        padding: '1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid rgba(99,102,241,0.2)',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Email per Alert Sottoscorta
                            </label>
                            <input
                                type="email"
                                placeholder="es: logistica@dfvautomazioni.it"
                                value={localSettings.inventoryEmail || ''}
                                onChange={(e) =>
                                    setLocalSettings((prev: any) => ({ ...prev, inventoryEmail: e.target.value }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                L'indirizzo a cui verranno inviate le notifiche quando un articolo scende sotto la
                                soglia minima impostata.
                            </p>
                        </div>
                    </div>
                </div>


                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start', marginTop: '1.5rem' }}
                >
                    <SettingsIcon size={18} /> Salva e Applica Globalmente
                </button>
            </form>
        </div>
    );
};
