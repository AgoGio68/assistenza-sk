import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Circle,
    X,
    ClipboardList,
    User,
    Calendar,
    AlertTriangle,
    CheckCheck,
    RotateCcw,
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { AuditLogService } from '../services/AuditLogService';
import { CollaudoReport, MachineType } from '../types';

// ─── Utility ──────────────────────────────────────────────────────
export const getMachineType = (machineName: string): MachineType => {
    const lower = (machineName || '').toLowerCase().trim();
    if (lower.startsWith('rp')) return 'rp';
    if (lower.startsWith('sp')) return 'sp';
    return 'generic';
};

// ─── Props ────────────────────────────────────────────────────────
interface CollaudoChecklistModalProps {
    installationId: string;
    machineName: string;
    clientName: string;
    scheduledDate?: string;
    onClose: () => void;
}
export const CollaudoChecklistModal: React.FC<CollaudoChecklistModalProps> = ({
    installationId,
    machineName,
    clientName,
    scheduledDate,
    onClose,
}) => {
    const { currentUser, userProfile, isSuperadmin, isAdmin } = useAuth();
    const { settings } = useSettings();

    const machineType = getMachineType(machineName);
    const [checklists, setChecklists] = useState<any>(settings.collaudoChecklists || { rp: [], sp: [] });
    const navigate = useNavigate();

    // Task 4: Load from new collaudo_checklists collection
    useEffect(() => {
        const fetchChecklists = async () => {
            try {
                const q = query(collection(db, 'collaudo_checklists'));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const loaded: any = {};
                    snap.docs.forEach(d => loaded[d.id] = d.data());
                    setChecklists(loaded);
                }
            } catch (err) {
                console.error('Error fetching checklists from collection:', err);
            }
        };
        fetchChecklists();
    }, []);

    // v3.4.0: Logica di selezione dinamica
    const [selectedKey, setSelectedKey] = useState<string>(
        machineType === 'rp' ? 'rp' : machineType === 'sp' ? 'sp' : 'rp',
    );

    const checklistItems: string[] = (() => {
        const cat = (checklists as any)[selectedKey];
        return cat?.items || [];
    })();

    const [report, setReport] = useState<CollaudoReport | null>(null);
    const [completedItems, setCompletedItems] = useState<string[]>([]);
    const [savedItems, setSavedItems] = useState<string[]>([]); // snapshot dell'ultimo salvataggio
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const reportId = `collaudo-${installationId}`;

    // ─── Carica report esistente ──────────────────────────────────
    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            try {
                const ref = doc(db, 'collaudo_reports', reportId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data() as CollaudoReport;
                    setReport({ ...data, id: snap.id });
                    setCompletedItems(data.completedItems || []);
                    setSavedItems(data.completedItems || []); // snapshot iniziale
                } else {
                    setReport(null);
                    setCompletedItems([]);
                    setSavedItems([]); // nessun dato → snapshot vuoto
                }
            } catch (err) {
                console.error('Errore caricamento report collaudo:', err);
            }
            setLoading(false);
        };
        loadReport();
    }, [reportId]);

    // ─── Rileva modifiche non salvate ─────────────────────────────
    const hasUnsaved =
        !saved &&
        !loading &&
        (completedItems.length !== savedItems.length ||
            completedItems.some((i) => !savedItems.includes(i)) ||
            savedItems.some((i) => !completedItems.includes(i)));

    // ─── Chiusura sicura ──────────────────────────────────────────
    const handleClose = () => {
        if (hasUnsaved) {
            const ok = window.confirm('Hai modifiche non salvate nella checklist.\n\nVuoi uscire senza salvare?');
            if (!ok) return;
        }
        onClose();
    };

    // ─── Toggle singola voce ──────────────────────────────────────
    const toggleItem = (item: string) => {
        setCompletedItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
        setSaved(false);
    };

    // ─── Salva progressione ───────────────────────────────────────
    const saveProgress = async (markComplete = false) => {
        if (!currentUser) return;
        setSaving(true);
        try {
            const now = Date.now();
            const ref = doc(db, 'collaudo_reports', reportId);

            const reportData: CollaudoReport = {
                installationId,
                machineName,
                machineType,
                clientName,
                checklist: checklistItems,
                completedItems,
                completedAt: markComplete ? now : (report?.completedAt ?? null),
                technicianId: currentUser.uid,
                technicianName: userProfile?.displayName || userProfile?.email || 'N/D',
                createdAt: report?.createdAt ?? now,
                updatedAt: now,
            };

            await setDoc(ref, reportData, { merge: true });
            setReport({ ...reportData, id: reportId });
            setSaved(true);
            setSavedItems([...completedItems]); // aggiorna snapshot

            if (markComplete) {
                // Aggiornamento stato Collaudo come Completato (Trigger Colore Verde in SharedSheet)
                const instRef = doc(db, 'installation_data', installationId);
                await setDoc(instRef, {
                    tested: true,
                    testDate: new Date(now).toISOString(),
                    status: 'completato'
                }, { merge: true });

                // Scrittura "COLLAUDATO" sulla riga originaria dell'ordine (se non è un ticket)
                if (!installationId.startsWith('ticket-')) {
                    let currentSection: 'sk' | 's2' = 'sk';
                    try {
                        const instDoc = await getDoc(instRef);
                        if (instDoc.exists()) {
                            const instData = instDoc.data();
                            if (instData.section === 's2') {
                                currentSection = 's2';
                            }
                        }
                    } catch (err) {
                        console.error('Errore recupero section da installation_data:', err);
                    }

                    const sheetId = currentSection === 's2' ? 'ordini_s2' : 'ordini';
                    const ordineRef = doc(db, sheetId, installationId);
                    await setDoc(ordineRef, {
                        installazione: 'COLLAUDATO',
                        D: 'COLLAUDATO',
                        note_inst: 'COLLAUDATO',
                        J: 'COLLAUDATO',
                        commenti: 'COLLAUDATA',
                        I: 'COLLAUDATA',
                        style: '#d4edda' // Forza il verde anche sui campi testuali
                    }, { merge: true });
                }
                // GAGOS 2026-04-02: Global Audit Log
                const authorName = userProfile?.displayName || currentUser.displayName || 'Tecnico';
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : (isAdmin ? 'admin' : 'user'),
                    action: 'UPDATE',
                    resourceType: 'INSTALLATION',
                    resourceId: installationId,
                    details: `${authorName} ha COMPLETATO il COLLAUDO per ${clientName} (${machineName}).`,
                    metadata: { installationId, machineName, clientName }
                });
                
                // Reindirizzamento automatico alla Dashboard principale
                setTimeout(() => {
                    onClose();
                    navigate('/');
                }, 800);
            } else {
                // Se non è completo ma c'è progresso, impostiamo lo stato su 'in_corso' (Giallo)
                const instRef = doc(db, 'installation_data', installationId);
                await setDoc(instRef, {
                    status: completedItems.length > 0 ? 'in_corso' : 'in_attesa'
                }, { merge: true });
            }
        } catch (err) {
            console.error('Errore salvataggio report:', err);
            alert('Errore durante il salvataggio. Riprova.');
        }
        setSaving(false);
    };

    const allComplete = checklistItems.length > 0 && completedItems.length >= checklistItems.length;
    const progress = checklistItems.length > 0 ? Math.round((completedItems.length / checklistItems.length) * 100) : 0;

    const isCompleted = Boolean(report?.completedAt);

    const typeLabel = machineType === 'rp' ? 'RP' : machineType === 'sp' ? 'SP' : 'Generico';
    const typeColor = machineType === 'rp' ? '#6366f1' : machineType === 'sp' ? '#14b8a6' : '#f59e0b';

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 1500 }}>
            <div
                className="modal-body"
                style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        background: `linear-gradient(135deg, ${typeColor}22 0%, transparent 100%)`,
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '1rem',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        {/* Badge tipo macchina */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.25rem 0.7rem',
                                    background: typeColor + '22',
                                    color: typeColor,
                                    border: `1px solid ${typeColor}44`,
                                    borderRadius: 20,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                }}
                            >
                                <ClipboardList size={13} /> CHECKLIST {typeLabel}
                            </span>
                            {isCompleted && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.25rem 0.7rem',
                                        background: 'rgba(16,185,129,0.12)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16,185,129,0.25)',
                                        borderRadius: 20,
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                    }}
                                >
                                    <CheckCircle2 size={13} /> COMPLETATO
                                </span>
                            )}
                        </div>
                        {/* Info macchina */}
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '1.15rem',
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {clientName}
                            </h3>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {machineName}
                                {scheduledDate && (
                                    <span
                                        style={{
                                            marginLeft: '0.75rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        {new Date(scheduledDate).toLocaleDateString('it-IT', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: hasUnsaved ? 'var(--warning-color)' : 'var(--text-muted)',
                            padding: '0.25rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                        }}
                        title={hasUnsaved ? 'Modifiche non salvate — clicca per uscire' : 'Chiudi'}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        {hasUnsaved ? (
                            <span
                                style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 900,
                                    color: 'var(--warning-color)',
                                    marginRight: 2,
                                }}
                            >
                                ●
                            </span>
                        ) : null}
                        <X size={20} />
                    </button>
                </div>

                {/* Progress bar */}
                <div
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'var(--bg-elevated)',
                    }}
                >
                    {/* Selettore checklist (v3.4.0) */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.4rem',
                            marginBottom: '1rem',
                            overflowX: 'auto',
                            paddingBottom: '0.25rem',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                        }}
                    >
                        {(['rp', 'sp', 'c1', 'c2', 'c3', 'c4'] as const).map((key) => {
                            const isC = key.startsWith('c');
                            const label = isC
                                ? (checklists as any)[key]?.title || key.toUpperCase()
                                : key.toUpperCase();
                            const active = selectedKey === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => !isCompleted && setSelectedKey(key)}
                                    style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: 8,
                                        fontSize: '0.7rem',
                                        fontWeight: active ? 800 : 500,
                                        whiteSpace: 'nowrap',
                                        background: active ? typeColor : 'rgba(255,255,255,0.05)',
                                        color: active ? 'white' : 'var(--text-muted)',
                                        border: '1px solid ' + (active ? 'transparent' : 'var(--border-subtle)'),
                                        cursor: isCompleted ? 'default' : 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.4rem',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Avanzamento
                        </span>
                        <span
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: allComplete ? '#10b981' : 'var(--text-primary)',
                            }}
                        >
                            {completedItems.length} / {checklistItems.length}
                        </span>
                    </div>
                    <div
                        style={{
                            height: 7,
                            background: 'var(--bg-hover)',
                            borderRadius: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${progress}%`,
                                background: allComplete
                                    ? 'linear-gradient(90deg, #10b981, #059669)'
                                    : `linear-gradient(90deg, ${typeColor}, ${typeColor}99)`,
                                borderRadius: 10,
                                transition: 'width 0.35s ease',
                            }}
                        />
                    </div>
                </div>

                {/* Body — checklist */}
                <div
                    style={{
                        padding: '1rem 1.5rem',
                        maxHeight: '65vh',
                        overflowY: 'auto',
                    }}
                >
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Caricamento...
                        </div>
                    ) : checklistItems.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '2rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem',
                            }}
                        >
                            <AlertTriangle size={28} style={{ marginTop: '0.5rem', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                Nessuna voce configurata per macchine <strong>{typeLabel}</strong>.
                            </p>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
                                Configura le voci dal Pannello Admin → Collaudo.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {checklistItems.map((item, idx) => {
                                const done = completedItems.includes(item);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => !isCompleted && toggleItem(item)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.85rem',
                                            padding: '0.75rem 1rem',
                                            background: done ? 'rgba(16,185,129,0.07)' : 'var(--bg-elevated)',
                                            border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`,
                                            borderRadius: 'var(--border-radius-sm)',
                                            cursor: isCompleted ? 'default' : 'pointer',
                                            transition: 'all 0.18s',
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isCompleted)
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = done
                                                    ? 'rgba(16,185,129,0.5)'
                                                    : `${typeColor}66`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = done
                                                ? 'rgba(16,185,129,0.25)'
                                                : 'var(--border-subtle)';
                                        }}
                                    >
                                        {done ? (
                                            <CheckCircle2 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                                        ) : (
                                            <Circle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        )}
                                        <span
                                            style={{
                                                fontSize: '0.9rem',
                                                fontWeight: done ? 500 : 400,
                                                color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                textDecoration: done ? 'line-through' : 'none',
                                                opacity: done ? 0.7 : 1,
                                                flex: 1,
                                            }}
                                        >
                                            {item}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--text-muted)',
                                                fontWeight: 700,
                                                minWidth: 24,
                                                textAlign: 'right',
                                            }}
                                        >
                                            {idx + 1}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {checklistItems.length > 0 && (
                    <div
                        style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'flex',
                            gap: '0.75rem',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            background: 'var(--bg-elevated)',
                        }}
                    >
                        {/* Info tecnico */}
                        {report && (
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <User size={13} />
                                {report.technicianName}
                                {report.updatedAt && (
                                    <span>
                                        {' '}
                                        ·{' '}
                                        {new Date(report.updatedAt).toLocaleDateString('it-IT', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                )}
                            </div>
                        )}

                        {isCompleted ? (
                            /* Mostra opzione ri-apertura */
                            <button
                                onClick={() => {
                                    setReport((prev) => (prev ? { ...prev, completedAt: null } : null));
                                    setSaved(false);
                                }}
                                className="btn"
                                style={{ gap: '0.4rem', fontSize: '0.82rem' }}
                            >
                                <RotateCcw size={15} /> Riapri
                            </button>
                        ) : (
                            <>
                                {/* Salva progresso */}
                                <button
                                    onClick={() => saveProgress(false)}
                                    disabled={saving}
                                    className="btn"
                                    style={{ gap: '0.4rem', fontSize: '0.82rem' }}
                                >
                                    {saving ? '...' : saved ? '✓ Salvato' : 'Salva'}
                                </button>

                                {/* Completa collaudo */}
                                <button
                                    onClick={() => saveProgress(true)}
                                    disabled={saving || !allComplete}
                                    className={`btn ${allComplete ? 'btn-success' : ''}`}
                                    style={{
                                        gap: '0.4rem',
                                        fontSize: '0.82rem',
                                        opacity: allComplete ? 1 : 0.4,
                                        cursor: allComplete ? 'pointer' : 'not-allowed',
                                    }}
                                    title={allComplete ? 'Completa il collaudo in modo definitivo' : 'Completa tutte le voci prima di inviare'}
                                >
                                    <CheckCheck size={16} />
                                    {allComplete
                                        ? 'INVIA E CONCLUDI COLLAUDO'
                                        : `Mancano ${checklistItems.length - completedItems.length} voci`}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
