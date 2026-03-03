import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ticket } from '../types';
import { User, Clock, CheckCircle, Edit2, Save } from 'lucide-react';

export const Profile: React.FC = () => {
    const { currentUser, userProfile, updateDisplayName } = useAuth();
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
            <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={28} color="var(--primary-color)" /> Il Tuo Profilo
            </h2>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', backgroundColor: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nome Visualizzato</div>
                        {!isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <strong style={{ fontSize: '1.5rem' }}>{userProfile?.displayName || 'Nessun nome'}</strong>
                                <button onClick={() => setIsEditing(true)} className="btn" style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', fontSize: '1rem' }}
                                />
                                <button onClick={handleSaveName} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                    <Save size={20} />
                                </button>
                                <button onClick={() => setIsEditing(false)} className="btn" style={{ padding: '0.5rem', backgroundColor: '#f1f5f9' }}>
                                    Annulla
                                </button>
                            </div>
                        )}
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{userProfile?.email}</div>
                    </div>
                    <div style={{ padding: '0.5rem 1rem', borderRadius: '20px', backgroundColor: '#e2e8f0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        RUOLO: {userProfile?.role?.toUpperCase() || 'UTENTE'}
                    </div>
                </div>

                <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Le Tue Statistiche</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', borderRadius: '12px', backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '50%' }}>
                            <CheckCircle size={24} color="#15803d" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#166534' }}>Ticket Chiusi</div>
                            <strong style={{ fontSize: '1.5rem', color: '#15803d' }}>{loading ? '...' : stats.totalClosed}</strong>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem', borderRadius: '12px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '50%' }}>
                            <Clock size={24} color="#92400e" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#92400e' }}>Tempo Totale</div>
                            <strong style={{ fontSize: '1.5rem', color: '#b45309' }}>{loading ? '...' : `${stats.totalHours}h ${stats.totalMinutes}m`}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Queste statistiche mostrano il tuo contributo al sistema basato sui ticket che hai chiuso personalmente.
            </p>
        </div>
    );
};
