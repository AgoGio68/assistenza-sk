import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Check, X } from 'lucide-react';

interface VoiceDictationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (text: string) => void;
    initialText?: string;
    title?: string;
}

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialText = '',
    title = 'Aggiungi note'
}) => {
    const [text, setText] = useState(initialText);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    // Gestione Inizializzazione Web Speech API
    useEffect(() => {
        if (!isOpen) return;
        setText(initialText); // Reset the text to initial when opening

        let recon = null;
        if ('webkitSpeechRecognition' in window) {
            recon = new (window as any).webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            recon = new (window as any).SpeechRecognition();
        }

        if (recon) {
            recon.continuous = true;
            recon.interimResults = true;
            recon.lang = 'it-IT'; // Imposta la lingua italiana

            recon.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        setText(prev => (prev + ' ' + transcript).trim());
                    } else {
                        currentTranscript += transcript;
                    }
                }
            };

            recon.onend = () => {
                // Se era in ascolto e si interrompe (es. pausa lunga), disattiva il flag
                setIsListening(false);
            };

            recon.onerror = (event: any) => {
                console.error("Errore riconoscimento vocale:", event.error);
                setIsListening(false);
            };

            setRecognition(recon);
        }

        return () => {
            if (recon) {
                recon.stop();
            }
        };
    }, [isOpen, initialText]);

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
                // Fallback in caso sia già avviato o permessi negati
            }
        }
    };

    const handleSave = () => {
        if (isListening && recognition) {
            recognition.stop();
            setIsListening(false);
        }
        onSave(text);
        onClose();
    };

    const handleCancel = () => {
        if (isListening && recognition) {
            recognition.stop();
            setIsListening(false);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{title}</h3>
                    <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ position: 'relative' }}>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Scrivi qui gli appunti o usa il microfono per dettarli..."
                        style={{
                            width: '100%',
                            minHeight: '150px',
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
                    <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
                        In ascolto... Parla chiaro.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button onClick={handleCancel} className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0' }}>Annulla</button>
                    <button onClick={handleSave} className="btn btn-success" style={{ flex: 1 }}><Check size={18} /> Salva Appunti</button>
                </div>
            </div>
            {/* CSS per l'animazione pulse */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};
