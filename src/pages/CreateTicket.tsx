import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { UrgencyLevel, Ticket, Company } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export const CreateTicket: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { settings } = useSettings();
    const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [contactName, setContactName] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Company[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urgency) {
            alert("Seleziona l'urgenza!");
            return;
        }

        setLoading(true);

        try {
            const newTicket: Ticket = {
                urgency,
                companyName,
                contactName,
                phone,
                description,
                status: 'aperto',
                createdAt: Date.now()
            };

            await addDoc(collection(db, 'tickets'), newTicket);

            // Optionally save/update the company for autocomplete
            // Per semplicità qui potremmo fare una cloud function, ma per ora aggiorniamo lato client se non esiste
            navigate('/');
        } catch (err) {
            console.error(err);
            alert("Errore durante il salvataggio");
        } finally {
            setLoading(false);
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

                <button
                    type="submit"
                    className="btn btn-primary btn-large"
                    disabled={loading || !urgency}
                    style={{ marginTop: '1rem' }}
                >
                    {loading ? 'Invio in corso...' : 'INVIA ASSISTENZA'}
                </button>
            </form>
        </div>
    );
};
