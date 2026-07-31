import React, { useState } from 'react';
import { X, Save, Clock, Calendar as CalendarIcon, User, Tag, MessageSquare } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CalendarManualEvent } from '../types';
import { Trash2 } from 'lucide-react';

interface CalendarInsertModalProps {
    initialDate: string; // YYYY-MM-DD
    initialTime: string; // HH:mm
    onClose: () => void;
    existingEvent?: CalendarManualEvent;
}

export const CalendarInsertModal: React.FC<CalendarInsertModalProps> = ({
    initialDate,
    initialTime,
    onClose,
    existingEvent,
}) => {
    const isEdit = !!existingEvent;
    const [isSaving, setIsSaving] = useState(false);
    
    // Parse initial data if editing
    const initialData = existingEvent ? {
        cliente: existingEvent.cliente,
        tipo: existingEvent.tipo,
        data: existingEvent.dataInizio.split('T')[0],
        ora: existingEvent.dataInizio.split('T')[1].substring(0, 5),
        note: existingEvent.note || '',
    } : {
        cliente: '',
        tipo: 'Installazione' as CalendarManualEvent['tipo'],
        data: initialDate,
        ora: initialTime,
        note: '',
    };

    const [formData, setFormData] = useState(initialData);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.cliente) {
            alert('Inserisci un cliente o una descrizione.');
            return;
        }

        setIsSaving(true);
        try {
            if (!db) throw new Error("Istanza Firestore (db) non inizializzata.");

            const combinedStart = `${formData.data}T${formData.ora}:00`;
            
            let colore = '#3b82f6';
            if (formData.tipo === 'Collaudo') colore = '#22c55e';
            else if (formData.tipo === 'Riparazione') colore = '#ef4444';
            else if (formData.tipo === 'Sopralluogo') colore = '#f59e0b';

            const eventPayload: Omit<CalendarManualEvent, 'id'> = {
                cliente: formData.cliente,
                tipo: formData.tipo,
                dataInizio: combinedStart,
                colore: colore,
                note: formData.note,
                createdAt: existingEvent?.createdAt || Date.now(),
            };

            if (isEdit && existingEvent?.id) {
                console.log("Aggiornamento evento manuale ID:", existingEvent.id);
                await updateDoc(doc(db, 'eventi_calendario', existingEvent.id), eventPayload as any);
                console.log("Aggiornamento riuscito!");
            } else {
                console.log("Creazione nuovo evento manuale...");
                await addDoc(collection(db, 'eventi_calendario'), eventPayload);
                console.log("Creazione riuscita!");
            }
            alert("Salvataggio completato");
            onClose();
        } catch (error: any) {
            console.error("Errore dettagliato Firebase:", error.code, error.message);
            alert(`Errore durante il salvataggio: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existingEvent?.id) return;
        if (!window.confirm("Sei sicuro di voler eliminare questo appuntamento?")) return;

        setIsSaving(true);
        try {
            console.log("Eliminazione evento manuale ID:", existingEvent.id);
            await deleteDoc(doc(db, 'eventi_calendario', existingEvent.id));
            console.log("Eliminazione riuscita!");
            onClose();
        } catch (error: any) {
            console.error("Errore durante l'eliminazione:", error.code, error.message);
            alert("Errore durante l'eliminazione dell'evento.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="event-modal-overlay" onClick={onClose}>
            <div className="event-modal glass-panel anim-fade-in" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <div className="modal-badge" style={{ backgroundColor: isEdit ? '#a855f7' : 'var(--primary-color)' }}>
                        <CalendarIcon size={14} /> {isEdit ? 'MODIFICA APPUNTAMENTO' : 'NUOVO APPUNTAMENTO'}
                    </div>
                    <h2 className="modal-title">{isEdit ? 'Modifica Evento' : 'Crea Evento'}</h2>
                    <p className="modal-subtitle">{isEdit ? 'Modifica dati o elimina l\'evento' : 'Inserimento manuale nella collezione eventi_calendario'}</p>
                </div>

                <form onSubmit={handleSave} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">
                            <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Cliente / Descrizione
                        </label>
                        <input
                            type="text"
                            className="form-control-premium"
                            placeholder="Es: Cliente Rossi - Installazione Lavatrice"
                            value={formData.cliente}
                            onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Tag size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Tipo Attività
                        </label>
                        <select
                            className="form-control-premium"
                            value={formData.tipo}
                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                        >
                            <option value="Installazione">Installazione</option>
                            <option value="Collaudo">Collaudo</option>
                            <option value="Riparazione">Riparazione</option>
                            <option value="Sopralluogo">Sopralluogo</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <MessageSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Note / Dettagli
                        </label>
                        <textarea
                            className="form-control-premium"
                            placeholder="Aggiungi dettagli aggiuntivi..."
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            rows={3}
                            style={{ minHeight: '100px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">
                                <CalendarIcon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                Data
                            </label>
                            <input
                                type="date"
                                className="form-control-premium"
                                value={formData.data}
                                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                Ora
                            </label>
                            <input
                                type="time"
                                className="form-control-premium"
                                value={formData.ora}
                                onChange={(e) => setFormData({ ...formData, ora: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                                Annulla
                            </button>
                            <button type="submit" className="btn-primary" disabled={isSaving} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                                {isSaving ? <Clock className="spin" size={16} /> : <Save size={16} />}
                                {isEdit ? 'Aggiorna' : 'Salva'}
                            </button>
                        </div>
                        
                        {isEdit && (
                            <button 
                                type="button" 
                                className="btn-delete" 
                                onClick={handleDelete} 
                                disabled={isSaving}
                                style={{
                                    width: '100%',
                                    minHeight: '48px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    marginTop: '0.5rem'
                                }}
                            >
                                <Trash2 size={18} />
                                Elimina Appuntamento
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <style>{`
                .event-modal-overlay {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }
                .event-modal {
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                @media (max-width: 768px) {
                    .event-modal {
                        max-width: 100%;
                        width: 95%;
                        margin: 0 auto;
                        border-radius: 20px;
                    }
                }
                .form-control-premium {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    font-size: 16px; /* Prevent iOS zoom */
                    min-height: 48px; /* Touch friendly */
                    transition: all 0.2s;
                }
                textarea.form-control-premium {
                    min-height: 100px;
                }
                .form-control-premium:focus {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                    outline: none;
                }
                .form-label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .form-group {
                    margin-bottom: 1.25rem;
                }
                .modal-footer {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }
                .modal-footer button {
                    min-height: 48px;
                    font-size: 16px;
                    justify-content: center;
                }
            `}</style>
        </div>
    );
};
