import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { UrgencyLevel, Ticket, Company, UserProfile } from '../types';
import { AlertCircle, CheckCircle2, Camera, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export const CreateTicket: React.FC<{ section?: 'sk' | 's2' }> = ({ section = 'sk' }) => {
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

    // Gestione Pre-Assegnazione
    const { isSuperadmin } = useAuth();
    const canAssign = isSuperadmin ||
        (isAdmin && settings.adminCanAssignAtCreation !== false) ||
        (!isAdmin && settings.userCanAssignAtCreation === true);

    const [assignedTo, setAssignedTo] = useState<string>('');
    const [assignableUsers, setAssignableUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!canAssign) return;
            try {
                const q = query(collection(db, 'users'), where('status', '==', 'approved'));
                const snap = await getDocs(q);
                const fetched: UserProfile[] = [];
                snap.forEach(d => {
                    const data = d.data() as UserProfile;
                    // Tutti tranne i superadmin possono essere assegnatari (inclusi semplici utenti)
                    if (data.role !== 'superadmin') {
                        fetched.push({ ...data, uid: d.id });
                    }
                });
                setAssignableUsers(fetched);
            } catch (err) {
                console.error("Errore recupero utenti per assegnazione", err);
            }
        };
        fetchUsers();
    }, [canAssign]);

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

            const assigneeUser = assignedTo ? assignableUsers.find(u => u.uid === assignedTo) : null;

            const newTicket: Ticket = {
                urgency: urgency,
                companyName: companyName.trim(),
                contactName: contactName.trim(),
                phone: phone.trim(),
                description: description.trim(),
                status: assignedTo ? 'preso_in_carico' : 'aperto',
                createdAt: Date.now(),
                ...(uploadedPhotoUrls.length > 0 && { photoUrls: uploadedPhotoUrls }),
                createdBy: userProfile?.uid,
                creatorName: userProfile?.displayName || userProfile?.email || 'Anonimo',
                ...(assignedTo && assigneeUser && {
                    assignedTo: assignedTo,
                    assigneeName: assigneeUser.displayName || assigneeUser.email || 'Tecnico'
                }),
                section // Save the section the ticket belongs to
            };

            await setDoc(newTicketRef, newTicket);

            // Salvataggio azienda nei suggerimenti per il futuro se nuova (sostituisce vecchio local storage)
            try {
                const companiesQuery = query(collection(db, 'companies'), where('name', '==', companyName.trim()));
                const companiesSnapshot = await getDocs(companiesQuery);
                if (companiesSnapshot.empty) {
                    await setDoc(doc(collection(db, 'companies')), {
                        name: companyName.trim(),
                        contactName: contactName.trim(),
                        phone: phone.trim()
                    });
                }
            } catch (errCompany) {
                console.error("Non è stato possibile salvare l'azienda per i suggerimenti futuri", errCompany);
            }

            setCompanyName('');
            setContactName('');
            setPhone('');
            setDescription('');
            setUrgency(null);
            setPhotos([]);
            setAssignedTo('');

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
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: section === 's2' ? (settings.section2Color || 'var(--accent-teal)') : 'var(--text-primary)' }}>
                    Nuova Assistenza {section === 's2' ? (settings.section2Name || 'Sezione 2') : ''}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Compila il form per aprire un nuovo ticket di supporto</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Urgency Selection */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={() => setUrgency('urgente')}
                        style={{
                            flex: 1,
                            padding: '1.2rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            borderRadius: 'var(--border-radius-md)',
                            border: `2px solid ${urgency === 'urgente' ? 'var(--danger-color)' : 'rgba(244,63,94,0.2)'}`,
                            background: urgency === 'urgente' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'rgba(244,63,94,0.06)',
                            color: urgency === 'urgente' ? 'white' : '#fb7185',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.2s',
                            boxShadow: urgency === 'urgente' ? '0 4px 16px rgba(244,63,94,0.35)' : 'none',
                        }}
                    >
                        <AlertCircle size={22} /> URGENTE
                    </button>

                    <button
                        type="button"
                        onClick={() => setUrgency('non_urgente')}
                        style={{
                            flex: 1,
                            padding: '1.2rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            borderRadius: 'var(--border-radius-md)',
                            border: `2px solid ${urgency === 'non_urgente' ? 'var(--accent-teal)' : 'rgba(20,184,166,0.2)'}`,
                            background: urgency === 'non_urgente' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'rgba(20,184,166,0.06)',
                            color: urgency === 'non_urgente' ? 'white' : 'var(--accent-teal)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.2s',
                            boxShadow: urgency === 'non_urgente' ? '0 4px 16px rgba(20,184,166,0.35)' : 'none',
                        }}
                    >
                        <CheckCircle2 size={22} /> NORMALE
                    </button>
                </div>

                {/* Company AutoComplete */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Azienda</label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => {
                            setCompanyName(e.target.value);
                            setShowSuggestions(true);
                        }}
                        required
                        style={{ width: '100%', fontSize: '1rem' }}
                        placeholder="Nome azienda..."
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                            {suggestions.map(comp => (
                                <div
                                    key={comp.id}
                                    onClick={() => selectCompany(comp)}
                                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{comp.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {comp.contactName} ·  {comp.phone}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Referente</label>
                    <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        style={{ width: '100%', fontSize: '1rem' }}
                        placeholder="Nome di chi ha chiamato"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Telefono</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ width: '100%', fontSize: '1rem' }}
                        placeholder="Numero di telefono"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Breve Descrizione</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        style={{ width: '100%', fontSize: '1rem', minHeight: '100px', resize: 'vertical' }}
                        placeholder="Problema riscontrato..."
                    />
                </div>

                {canAssign && (
                    <div style={{ background: 'rgba(20,184,166,0.07)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(20,184,166,0.2)' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assegna Subito A (Opzionale)</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">Nessuno (Lascia in "Da Assegnare")</option>
                            {assignableUsers.map(u => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    </div>
                )}

                {settings.enablePhotos && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            <Camera size={15} /> Aggiungi Fotografie (Max 3)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            {photos.map((photo, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                    <img src={URL.createObjectURL(photo)} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(idx)}
                                        style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {photos.length < 3 && (
                                <label style={{ width: '80px', height: '80px', borderRadius: 'var(--border-radius-sm)', border: '2px dashed rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}>
                                    <Camera size={22} />
                                    <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} />
                                </label>
                            )}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Le immagini verranno compresse automaticamente prima dell'invio.</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !urgency}
                    style={{
                        marginTop: '0.75rem',
                        padding: '1.1rem',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        borderRadius: 'var(--border-radius-md)',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-violet) 100%)',
                        color: 'white',
                        cursor: loading || !urgency ? 'not-allowed' : 'pointer',
                        opacity: loading || !urgency ? 0.6 : 1,
                        boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    }}
                >
                    {loading ? (uploadProgress || 'Invio in corso...') : 'INVIA ASSISTENZA'}
                </button>
            </form>
        </div>
    );
};
