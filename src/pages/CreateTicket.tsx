import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { UrgencyLevel, Ticket, Company } from '../types';
import { AlertCircle, CheckCircle2, Camera, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export const CreateTicket: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, userProfile } = useAuth();
    const { settings } = useSettings();
    const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [contactName, setContactName] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Company[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [photos, setPhotos] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);

    useEffect(() => {
        // Blocca accesso se non admin e creazione disabilitata
        if (!isAdmin && !settings.allowUserTicketCreation) {
            navigate('/');
        }
    }, [isAdmin, settings.allowUserTicketCreation, navigate]);

    // Simple debounce for company search
    useEffect(() => {
        const searchCompanies = async () => {
            if (companyName.length < 2) {
                setSuggestions([]);
                return;
            }
            try {
                const q = query(
                    collection(db, 'companies'),
                    where('name', '>=', companyName),
                    where('name', '<=', companyName + '\uf8ff'),
                    limit(5)
                );
                const querySnapshot = await getDocs(q);
                const results: Company[] = [];
                querySnapshot.forEach((doc) => {
                    results.push({ id: doc.id, ...doc.data() } as Company);
                });
                setSuggestions(results);
            } catch (err) {
                console.error("Error searching companies:", err);
            }
        };

        const timeoutId = setTimeout(searchCompanies, 300);
        return () => clearTimeout(timeoutId);
    }, [companyName]);

    const selectCompany = (company: Company) => {
        setCompanyName(company.name);
        setContactName(company.contactName);
        setPhone(company.phone);
        setShowSuggestions(false);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            // Limit to max 3 photos per ticket maybe? Or let them upload what they want
            setPhotos(prev => [...prev, ...selectedFiles].slice(0, 3)); // Max 3 photos for safety
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urgency) {
            alert("Seleziona l'urgenza!");
            return;
        }

        setLoading(true);

        try {
            // Pre-generate document ID so we can use it for storage path
            const newTicketRef = doc(collection(db, 'tickets'));
            const ticketId = newTicketRef.id;

            let uploadedPhotoUrls: string[] = [];

            if (photos.length > 0 && settings.enablePhotos) {
                setUploadProgress("Compressione e caricamento foto...");
                for (let i = 0; i < photos.length; i++) {
                    const file = photos[i];
                    try {
                        // Comprimi immagine prima dell'upload (max 1MB, let's say 800px max width)
                        const options = {
                            maxSizeMB: 0.5,
                            maxWidthOrHeight: 1024,
                            useWebWorker: true
                        };
                        const compressedFile = await imageCompression(file, options);

                        // Upload
                        const storageRef = ref(storage, `tickets/${ticketId}/photo_${Date.now()}_${i}.jpg`);
                        await uploadBytes(storageRef, compressedFile);
                        const downloadUrl = await getDownloadURL(storageRef);
                        uploadedPhotoUrls.push(downloadUrl);
                    } catch (uploadError) {
                        console.error("Errore upload foto:", uploadError);
                        // Continuiamo con la creazione del ticket anche se una foto fallisce
                    }
                }
            }

            const newTicket: Ticket = {
                urgency: urgency,
                companyName: companyName.trim(),
                contactName: contactName.trim(),
                phone: phone.trim(),
                description: description.trim(),
                status: 'aperto',
                createdAt: Date.now(),
                ...(uploadedPhotoUrls.length > 0 && { photoUrls: uploadedPhotoUrls }),
                createdBy: userProfile?.uid,
                creatorName: userProfile?.displayName || userProfile?.email || 'Anonimo'
            };

            await setDoc(newTicketRef, newTicket);

            navigate('/');
        } catch (err) {
            console.error(err);
            alert("Errore durante il salvataggio");
        } finally {
            setLoading(false);
            setUploadProgress(null);
        }
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Nuova Assistenza</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Urgency Selection */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => setUrgency('urgente')}
                        className={`btn ${urgency === 'urgente' ? 'btn-danger' : ''}`}
                        style={{
                            flex: 1,
                            padding: '1.5rem',
                            fontSize: '1.25rem',
                            backgroundColor: urgency === 'urgente' ? 'var(--danger-color)' : 'white',
                            color: urgency === 'urgente' ? 'white' : 'var(--danger-color)',
                            border: '2px solid var(--danger-color)'
                        }}
                    >
                        <AlertCircle size={28} /> URGENTE
                    </button>

                    <button
                        type="button"
                        onClick={() => setUrgency('non_urgente')}
                        className={`btn ${urgency === 'non_urgente' ? 'btn-success' : ''}`}
                        style={{
                            flex: 1,
                            padding: '1.5rem',
                            fontSize: '1.25rem',
                            backgroundColor: urgency === 'non_urgente' ? 'var(--success-color)' : 'white',
                            color: urgency === 'non_urgente' ? 'white' : 'var(--success-color)',
                            border: '2px solid var(--success-color)'
                        }}
                    >
                        <CheckCircle2 size={28} /> NORMALE
                    </button>
                </div>

                {/* Company AutoComplete */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Azienda</label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => {
                            setCompanyName(e.target.value);
                            setShowSuggestions(true);
                        }}
                        required
                        style={{ width: '100%', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                        placeholder="Nome azienda..."
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', overflow: 'hidden' }}>
                            {suggestions.map(comp => (
                                <div
                                    key={comp.id}
                                    onClick={() => selectCompany(comp)}
                                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                                >
                                    <div style={{ fontWeight: 600 }}>{comp.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {comp.contactName} - {comp.phone}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Referente</label>
                    <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        style={{ width: '100%', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                        placeholder="Nome di chi ha chiamato"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Telefono</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ width: '100%', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                        placeholder="Numero di telefono"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Breve Descrizione</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        style={{ width: '100%', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '100px', resize: 'vertical' }}
                        placeholder="Problema riscontrato..."
                    />
                </div>

                {settings.enablePhotos && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            <Camera size={18} /> Aggiungi Fotografie (Max 3)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                            {photos.map((photo, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                    <img src={URL.createObjectURL(photo)} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(idx)}
                                        style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {photos.length < 3 && (
                                <label style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'white', color: '#94a3b8' }}>
                                    <Camera size={24} />
                                    <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} />
                                </label>
                            )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Le immagini verranno compresse automaticamente prima dell'invio per risparmiare traffico dati.</p>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary btn-large"
                    disabled={loading || !urgency}
                    style={{ marginTop: '1rem' }}
                >
                    {loading ? (uploadProgress || 'Invio in corso...') : 'INVIA ASSISTENZA'}
                </button>
            </form>
        </div>
    );
};
