/**
 * RapportiniPage — Area Tecnici per l'invio rapportini foto
 *
 * Accessibile a tutti gli utenti autenticati (rotta /rapportini).
 * Replica la UX di foto.html ma integrata nel design system di assistenza-sk.
 */
import React, { useState, useRef } from 'react';
import { Camera, FolderOpen, Clock, CheckCircle, AlertCircle, Loader, FileImage } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { inviaRapportino } from '../services/RapportiniService';
import { useMyRapportini } from '../hooks/useRapportini';

type SendState = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

export const RapportiniPage: React.FC = () => {
    const { userProfile } = useAuth();
    const nomeTecnico = userProfile?.displayName || userProfile?.email || 'Tecnico';

    const [sendState, setSendState] = useState<SendState>('idle');
    const [showHistory, setShowHistory] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const { lista: storico, loading: loadingStorico } = useMyRapportini(nomeTecnico, 30);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSendState('compressing');

        // Acquisizione GPS (Frontend)
        let coords: { latitude: number, longitude: number } | undefined = undefined;
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
        } catch (err) {
            console.warn('[GPS] Posizione non disponibile o negata:', err);
        }

        try {
            setSendState('uploading');
            await inviaRapportino(file, nomeTecnico, coords);
            setSendState('success');
            setTimeout(() => setSendState('idle'), 3500);
        } catch (err) {
            console.error('[Rapportini] Errore invio:', err);
            setSendState('error');
            setTimeout(() => setSendState('idle'), 3500);
        } finally {
            // Reset input per permettere lo stesso file due volte
            if (cameraRef.current) cameraRef.current.value = '';
            if (galleryRef.current) galleryRef.current.value = '';
        }
    };

    const isBusy = sendState === 'compressing' || sendState === 'uploading';

    const getStatusContent = () => {
        switch (sendState) {
            case 'compressing':
                return { icon: <Loader size={18} className="spin-icon" />, text: 'Elaborazione...', color: 'var(--text-secondary)' };
            case 'uploading':
                return { icon: <Loader size={18} className="spin-icon" />, text: 'Invio in corso...', color: 'var(--primary-color)' };
            case 'success':
                return { icon: <CheckCircle size={18} />, text: 'Inviato con successo!', color: '#22c55e' };
            case 'error':
                return { icon: <AlertCircle size={18} />, text: 'Errore invio — riprova', color: 'var(--danger-color)' };
            default:
                return null;
        }
    };

    const statusContent = getStatusContent();

    return (
        <div style={{ 
            minHeight: 'calc(100vh - 140px)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '1rem',
            marginTop: '20px'
        }}>
            <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
                {/* Header */}
                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                    <h1
                        style={{
                            fontSize: '1.6rem',
                            fontWeight: 800,
                            marginBottom: '0.4rem',
                            background: 'linear-gradient(135deg, var(--text-primary), var(--text-muted))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        📸 Rapportini
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        Tecnico: <strong style={{ color: 'var(--text-primary)' }}>{nomeTecnico.toUpperCase()}</strong>
                    </p>
                </div>

                {/* Card principale invio */}
                <div
                    className="glass-panel"
                    style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--border-radius-xl)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        marginBottom: '1rem',
                    }}
                >
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

                    {/* Bottone SCATTA FOTO */}
                    <button
                        className="btn btn-primary"
                        disabled={isBusy}
                        onClick={() => cameraRef.current?.click()}
                        style={{
                            padding: '0.85rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            borderRadius: 'var(--border-radius-lg)',
                            background: isBusy ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                            border: 'none',
                            color: 'white',
                            boxShadow: isBusy ? 'none' : '0 4px 20px rgba(34,197,94,0.35)',
                            transition: 'all 0.2s',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            opacity: isBusy ? 0.6 : 1,
                        }}
                    >
                        <Camera size={20} /> SCATTA FOTO
                    </button>

                    {/* Bottone GALLERIA */}
                    <button
                        className="btn"
                        disabled={isBusy}
                        onClick={() => galleryRef.current?.click()}
                        style={{
                            padding: '0.85rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            borderRadius: 'var(--border-radius-lg)',
                            background: isBusy ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            border: 'none',
                            color: 'white',
                            boxShadow: isBusy ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
                            transition: 'all 0.2s',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            opacity: isBusy ? 0.6 : 1,
                        }}
                    >
                        <FolderOpen size={20} /> CARICA DA GALLERIA
                    </button>

                    {/* Stato invio */}
                    {statusContent && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                color: statusContent.color,
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                padding: '0.5rem',
                                animation: 'fadeInUp 0.3s ease',
                            }}
                        >
                            {statusContent.icon}
                            {statusContent.text}
                        </div>
                    )}

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0' }} />

                    {/* Bottone storico */}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--border-radius-lg)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem',
                        }}
                    >
                        <Clock size={16} />
                        {showHistory ? 'CHIUDI STORICO' : `🗂️ VEDI INVIATI (STORICO)`}
                        {!showHistory && storico.length > 0 && (
                            <span
                                style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    borderRadius: '100px',
                                    padding: '0.1rem 0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}
                            >
                                {storico.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Lista storico */}
                {showHistory && (
                    <div
                        style={{
                            background: 'transparent',
                            overflow: 'hidden',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px',
                            padding: '4px',
                            border: 'none',
                            boxShadow: 'none',
                        }}
                    >
                        {loadingStorico ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Loader size={20} className="spin-icon" />
                            </div>
                        ) : storico.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <FileImage size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0 }}>Nessun rapportino inviato</p>
                            </div>
                        ) : (
                            storico.map((r) => (
                                <div
                                    key={r.id}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '1/1',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border-subtle)',
                                    }}
                                    onClick={() => window.open(r.fotoUrl, '_blank')}
                                >
                                    <img
                                        src={r.fotoUrl}
                                        alt="rapportino"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    {/* Overlay Stato e Data */}
                                    <div 
                                        style={{ 
                                            position: 'absolute', 
                                            bottom: 0, 
                                            left: 0, 
                                            right: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                            padding: '4px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 600 }}>
                                            {r.data.split(',')[0].slice(0, 5)}
                                        </span>
                                        <span 
                                            style={{ 
                                                fontSize: '0.55rem', 
                                                fontWeight: 800, 
                                                color: (r.stato || 'nuovo') === 'nuovo' ? '#fbbf24' : '#4ade80' 
                                            }}
                                         >
                                            {(r.stato || 'NEW').toUpperCase()}
                                        </span>
                                        {r.lat && r.lng && (
                                            <span 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`, '_blank');
                                                }}
                                                style={{ 
                                                    fontSize: '0.8rem', 
                                                    marginTop: '2px',
                                                    cursor: 'pointer',
                                                    filter: 'drop-shadow(0 0 2px black)'
                                                }}
                                                title="Vedi posizione su Google Maps"
                                            >
                                                📍
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Animazione spin per loader */}
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(6px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .spin-icon {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};
