import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ticket } from '../types';
import { User, Clock, CheckCircle, Edit2, Save, X, ArrowLeft } from 'lucide-react';

export const Profile: React.FC = () => {
    const { currentUser, userProfile, updateDisplayName } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalClosed: 0,
        totalHours: 0,
        totalMinutes: 0
    });
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(userProfile?.displayName || '');

    useEffect(() => {
        const fetchMyStats = async () => {
            if (!currentUser) return;
            try {
                const q = query(
                    collection(db, 'tickets'),
                    where('assignedTo', '==', currentUser.uid),
                    where('status', '==', 'chiuso')
                );
                const snapshot = await getDocs(q);
                let hours = 0;
                let minutes = 0;
                snapshot.forEach(doc => {
                    const data = doc.data() as Ticket;
                    hours += data.durationHours || 0;
                    minutes += data.durationMinutes || 0;
                });

                setStats({
                    totalClosed: snapshot.size,
                    totalHours: hours + Math.floor(minutes / 60),
                    totalMinutes: minutes % 60
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyStats();
    }, [currentUser]);

    const handleSaveName = async () => {
        if (newName.trim() === '') return;
        try {
            await updateDisplayName(newName.trim());
            setIsEditing(false);
        } catch (err) {
            alert("Errore durante l'aggiornamento del nome.");
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            {/* Header with back button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <User size={28} color="var(--primary-color)" /> Il Tuo Profilo
                </h2>
                <button
                    onClick={() => navigate(-1)}
                    className="btn"
                    title="Torna indietro"
                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <ArrowLeft size={18} /> Indietro
                </button>
            </div>

            {/* Main card — dark theme */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                            Nome Visualizzato
                        </div>
                        {!isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <strong style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                                    {userProfile?.displayName || 'Nessun nome'}
                                </strong>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="btn"
                                    title="Modifica nome"
                                    style={{ padding: '0.3rem 0.6rem' }}
                                >
                                    <Edit2 size={15} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '8px', fontSize: '1rem', width: '200px' }}
                                />
                                <button onClick={handleSaveName} className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }}>
                                    <Save size={18} />
                                </button>
                                <button onClick={() => setIsEditing(false)} className="btn" style={{ padding: '0.5rem 0.75rem' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {userProfile?.email}
                        </div>
                    </div>

                    {/* Role badge */}
                    <div style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '100px',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#a5b4fc',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                    }}>
                        {userProfile?.role?.toUpperCase() || 'UTENTE'}
                    </div>
                </div>

                {/* Section title */}
                <div className="section-title">Le Tue Statistiche</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                    {/* Ticket Chiusi */}
                    <div style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                    }}>
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '0.75rem',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CheckCircle size={24} color="var(--success-color)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Ticket Chiusi
                            </div>
                            <strong style={{ fontSize: '1.75rem', color: 'var(--success-color)', fontWeight: 800 }}>
                                {loading ? '...' : stats.totalClosed}
                            </strong>
                        </div>
                    </div>

                    {/* Tempo Totale */}
                    <div style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                    }}>
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '0.75rem',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Clock size={24} color="var(--warning-color)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Tempo Totale
                            </div>
                            <strong style={{ fontSize: '1.75rem', color: 'var(--warning-color)', fontWeight: 800 }}>
                                {loading ? '...' : `${stats.totalHours}h ${stats.totalMinutes}m`}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Queste statistiche mostrano il tuo contributo al sistema basato sui ticket che hai chiuso personalmente.
            </p>
        </div>
    );
};
