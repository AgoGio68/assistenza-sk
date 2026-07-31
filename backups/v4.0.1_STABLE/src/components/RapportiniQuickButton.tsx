/**
 * RapportiniQuickButton — Pulsante flottante riusabile per invio rapportini
 *
 * Apre un modal overlay con tutta la UI di invio foto senza cambiare rotta.
 * Può essere piazzato in QUALSIASI componente con una sola riga:
 *   <RapportiniQuickButton />
 *
 * Per admin: mostra anche un badge con i rapportini in attesa.
 */
import React, { useState, useRef } from 'react';
import { Camera, X, FolderOpen, CheckCircle, AlertCircle, Loader, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { inviaRapportino } from '../services/RapportiniService';
import { useAllRapportini, useMyRapportini } from '../hooks/useRapportini';

type SendState = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

interface RapportiniQuickButtonProps {
    /** Variante visiva: 'nav' per la navbar, 'fab' per floating action button, 'inline' per bottone testuale */
    variant?: 'nav' | 'fab' | 'inline';
    /** Mostra badge con count rapportini nuovi (solo admin) */
    showBadge?: boolean;
    /** Colore personalizzato per l'icona (v3.9.1) */
    color?: string;
}

export const RapportiniQuickButton: React.FC<RapportiniQuickButtonProps> = ({
    variant = 'nav',
    showBadge = false,
    color: customColor,
}) => {
    const { userProfile, isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [sendState, setSendState] = useState<SendState>('idle');
    const [showHistory, setShowHistory] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const nomeTecnico = userProfile?.displayName || userProfile?.email || 'Tecnico';

    // Per lo storico del tecnico
    const { lista: storico, loading: loadingStorico } = useMyRapportini(nomeTecnico, 15);

    // Per il badge — solo se richiesto e solo per admin
    const { badgeCount } = useAllRapportini(showBadge && isAdmin ? 500 : 0);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSendState('compressing');
        try {
            setSendState('uploading');
            await inviaRapportino(file, nomeTecnico);
            setSendState('success');
            setTimeout(() => {
                setSendState('idle');
                setIsOpen(false);
            }, 2500);
        } catch {
            setSendState('error');
            setTimeout(() => setSendState('idle'), 3000);
        } finally {
            if (cameraRef.current) cameraRef.current.value = '';
            if (galleryRef.current) galleryRef.current.value = '';
        }
    };

    const isBusy = sendState === 'compressing' || sendState === 'uploading';
    const showCount = showBadge && isAdmin && badgeCount > 0;

    // ─── Trigger button styles ─────────────────────────────────────────────

    const renderTrigger = () => {
        if (variant === 'fab') {
            return (
                <button
                    onClick={() => setIsOpen(true)}
                    title="Invia Rapportino Foto"
                    style={{
                        position: 'fixed',
                        bottom: '1.5rem',
                        right: '1.5rem',
                        zIndex: 900,
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(34,197,94,0.45)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 28px rgba(34,197,94,0.6)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,197,94,0.45)';
                    }}
                >
                    <Camera size={26} />
                    {showCount && (
                        <span
                            style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                background: '#ef4444',
                                color: 'white',
                                borderRadius: '100px',
                                minWidth: 20,
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                border: '2px solid var(--bg-surface, #18181b)',
                            }}
                        >
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                </button>
            );
        }

        if (variant === 'inline') {
            return (
                <button
                    onClick={() => setIsOpen(true)}
                    className="btn btn-primary"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 1.1rem',
                        borderRadius: 'var(--border-radius-md)',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        position: 'relative',
                    }}
                >
                    <Camera size={16} /> Rapportino
                    {showCount && (
                        <span
                            style={{
                                background: '#ef4444',
                                color: 'white',
                                borderRadius: '100px',
                                minWidth: 18,
                                height: 18,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                marginLeft: '0.2rem',
                            }}
                        >
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                </button>
            );
        }

        // variant === 'nav' (default)
        return (
            <button
                onClick={() => setIsOpen(true)}
                title="Invia rapportino foto"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: `1px solid ${customColor ? `${customColor}44` : 'rgba(34,197,94,0.3)'}`,
                    background: customColor ? `${customColor}11` : 'rgba(34,197,94,0.1)',
                    color: customColor || '#22c55e',
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                    position: 'relative',
                    flexShrink: 0,
                    marginRight: '0.25rem',
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 12px ${customColor || '#22c55e'}44`;
                    (e.currentTarget as HTMLButtonElement).style.background = customColor ? `${customColor}22` : 'rgba(34,197,94,0.15)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLButtonElement).style.background = customColor ? `${customColor}11` : 'rgba(34,197,94,0.1)';
                }}
            >
                <Camera size={18} strokeWidth={2.2} color={customColor} />
                {showCount && (
                    <span
                        style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '100px',
                            minWidth: 16,
                            height: 16,
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 3px',
                            border: '1.5px solid var(--bg-surface, #18181b)',
                        }}
                    >
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </button>
        );
    };

    // ─── Modal overlay ─────────────────────────────────────────────────────

    return (
        <>
            {renderTrigger()}

            {isOpen && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget && !isBusy) setIsOpen(false); }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        animation: 'fadeIn 0.25s ease',
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--border-radius-xl)',
                            width: '100%',
                            maxWidth: 380,
                            padding: '1.75rem',
                            boxShadow: 'var(--shadow-xl)',
                            animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        {/* Header modal */}
                        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                📸 Invia Rapportino
                            </h3>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {nomeTecnico.toUpperCase()}
                            </p>
                            {!isBusy && (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        position: 'absolute',
                                        right: -10,
                                        top: -10,
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: 'var(--shadow-sm)',
                                        transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Input nascosti */}
                        <input
                            ref={cameraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={handleFile}
                            disabled={isBusy}
                        />
                        <input
                            ref={galleryRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFile}
                            disabled={isBusy}
                        />

                        {/* Feedback stato */}
                        {sendState === 'idle' ? (
                            <>
                                <button
                                    onClick={() => cameraRef.current?.click()}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        marginBottom: '0.75rem',
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        border: 'none',
                                        borderRadius: 'var(--border-radius-lg)',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.6rem',
                                        boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                                        transition: 'transform 0.15s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    <Camera size={20} /> SCATTA FOTO
                                </button>
                                <button
                                    onClick={() => galleryRef.current?.click()}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        border: 'none',
                                        borderRadius: 'var(--border-radius-lg)',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.6rem',
                                        boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                                        transition: 'transform 0.15s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    <FolderOpen size={20} /> CARICA DA GALLERIA
                                </button>

                                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.75rem 0' }} />

                                {/* Bottone storico nel modale */}
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--border-radius-md)',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    <Clock size={14} />
                                    {showHistory ? 'CHIUDI STORICO' : `🗂️ VEDI INVIATI (STORICO)`}
                                    {!showHistory && storico.length > 0 && (
                                        <span
                                            style={{
                                                background: 'var(--primary-color)',
                                                color: 'white',
                                                borderRadius: '100px',
                                                padding: '0.05rem 0.4rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {storico.length}
                                        </span>
                                    )}
                                </button>

                                {/* Lista storico nel modale */}
                                {showHistory && (
                                    <div
                                        style={{
                                            marginTop: '0.75rem',
                                            maxHeight: 250,
                                            overflowY: 'auto',
                                            borderRadius: 'var(--border-radius-md)',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-elevated)',
                                        }}
                                    >
                                        {loadingStorico ? (
                                            <div style={{ padding: '1rem', textAlign: 'center' }}>
                                                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                            </div>
                                        ) : storico.length === 0 ? (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                Nessun inviato recente
                                            </div>
                                        ) : (
                                            storico.map((r) => (
                                                <div
                                                    key={r.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        padding: '0.6rem 0.75rem',
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => window.open(r.fotoUrl, '_blank')}
                                                >
                                                    <img src={r.fotoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {r.data.split(',')[0]}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                            {r.data.split(',')[1]?.trim()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '2.5rem 1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                }}
                            >
                                {isBusy && (
                                    <>
                                        <Loader
                                            size={42}
                                            style={{
                                                color: 'var(--primary-color)',
                                                animation: 'spin 1s linear infinite',
                                            }}
                                        />
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            {sendState === 'compressing' ? 'Elaborazione...' : 'Invio in corso...'}
                                        </span>
                                    </>
                                )}
                                {sendState === 'success' && (
                                    <>
                                        <CheckCircle size={48} style={{ color: '#22c55e' }} />
                                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>
                                            Inviato con successo!
                                        </span>
                                    </>
                                )}
                                {sendState === 'error' && (
                                    <>
                                        <AlertCircle size={48} style={{ color: 'var(--danger-color)' }} />
                                        <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>
                                            Errore — riprova
                                        </span>
                                        <button
                                            onClick={() => setSendState('idle')}
                                            className="btn"
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            Riprova
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(30px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
};
