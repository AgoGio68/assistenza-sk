import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Check, X, Clock } from 'lucide-react';

interface CloseTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (durationHours: number, durationMinutes: number, notes: string) => void;
    initialNotes?: string;
}

export const CloseTicketModal: React.FC<CloseTicketModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialNotes = ''
}) => {
    const [notes, setNotes] = useState(initialNotes);
    const [hours, setHours] = useState<number>(0);
    const [minutes, setMinutes] = useState<number>(0);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (!isOpen) return;
        setNotes(initialNotes);
        setHours(0);
        setMinutes(0);

        let recon = null;
        if ('webkitSpeechRecognition' in window) {
            recon = new (window as any).webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            recon = new (window as any).SpeechRecognition();
        }

        if (recon) {
            recon.continuous = true;
            recon.interimResults = true;
            recon.lang = 'it-IT';

            recon.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        setNotes(prev => (prev + ' ' + transcript).trim());
                    } else {
                        currentTranscript += transcript;
                    }
                }
            };

            recon.onend = () => setIsListening(false);
            recon.onerror = () => setIsListening(false);
            setRecognition(recon);
        }

        return () => {
            if (recon) recon.stop();
        };
    }, [isOpen, initialNotes]);

    const toggleListening = () => {
        if (!recognition) {
            alert('Il tuo browser non supporta la dettatura vocale.');
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            try {
                recognition.start();
                setIsListening(true);
            } catch (e) {
                console.error("Errore avvio microfono", e);
            }
        }
    };

    const handleConfirm = () => {
        if (hours === 0 && minutes === 0) {
            if (!window.confirm("Hai inserito 0 ore e 0 minuti. Vuoi procedere comunque?")) return;
        }
        if (isListening && recognition) {
            recognition.stop();
            setIsListening(false);
        }
        onSave(hours, minutes, notes);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={24} /> Chiudi Intervento
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        Durata dell'intervento:
                    </label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    min="0"
                                    value={hours}
                                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                                <span style={{ fontSize: '0.875rem' }}>ore</span>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minutes}
                                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                                <span style={{ fontSize: '0.875rem' }}>min</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Note finali:
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descrivi brevemente l'intervento svolto o aggiungi note finali..."
                        style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '1rem',
                            paddingRight: '3rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }}
                    />
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
                        style={{
                            position: 'absolute',
                            bottom: '1rem',
                            right: '1rem',
                            padding: '0.5rem',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title={isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                </div>

                {isListening && (
                    <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 'bold' }}>
                        In ascolto...
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onClose} className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0' }}>Annulla</button>
                    <button onClick={handleConfirm} className="btn btn-success" style={{ flex: 1 }}><Check size={18} /> Chiudi Intervento</button>
                </div>
            </div>
        </div>
    );
};
