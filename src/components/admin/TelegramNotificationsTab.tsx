import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trash2, Plus, Bell, Info } from 'lucide-react';

interface TelegramSubscriber {
    id: string;
    nome: string;
    chatId: string;
    attivo: boolean;
    isOwner: boolean;
}

export const TelegramNotificationsTab: React.FC = () => {
    const [subscribers, setSubscribers] = useState<TelegramSubscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newChatId, setNewChatId] = useState('');

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'notifiche_telegram'));
            const snapshot = await getDocs(q);
            const fetched: TelegramSubscriber[] = [];
            snapshot.forEach((docSnap) => {
                fetched.push({ id: docSnap.id, ...docSnap.data() } as TelegramSubscriber);
            });
            setSubscribers(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newChatId.trim()) return;

        try {
            const docRef = doc(collection(db, 'notifiche_telegram'));
            const newData: Omit<TelegramSubscriber, 'id'> = {
                nome: newName.trim(),
                chatId: newChatId.trim(),
                attivo: true,
                isOwner: false
            };
            await setDoc(docRef, newData);
            setSubscribers([...subscribers, { id: docRef.id, ...newData }]);
            setNewName('');
            setNewChatId('');
        } catch (err) {
            console.error(err);
            alert("Errore durante l'aggiunta.");
        }
    };

    const toggleActive = async (sub: TelegramSubscriber) => {
        try {
            const docRef = doc(db, 'notifiche_telegram', sub.id);
            await updateDoc(docRef, { attivo: !sub.attivo });
            setSubscribers(subscribers.map(s => s.id === sub.id ? { ...s, attivo: !sub.attivo } : s));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Rimuovere questo tecnico dalle notifiche?")) return;
        try {
            await deleteDoc(doc(db, 'notifiche_telegram', id));
            setSubscribers(subscribers.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
                    <Bell size={24} />
                    <h3 style={{ margin: 0 }}>Gestione Notifiche Telegram</h3>
                </div>

                <div style={{ 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    padding: '1rem', 
                    borderRadius: 'var(--border-radius-md)', 
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    gap: '0.75rem'
                }}>
                    <Info size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-secondary)' }}>
                        Per ottenere il proprio Chat ID, avviare il bot <b>@TecnicoSK_bot</b> e poi consultare <b>@userinfobot</b> su Telegram.
                    </p>
                </div>

                <form onSubmit={handleAdd} style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1rem',
                    borderRadius: 'var(--border-radius-md)'
                }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            placeholder="Nome Tecnico (es. Mario Rossi)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            placeholder="Chat ID (es. 123456789)"
                            value={newChatId}
                            onChange={(e) => setNewChatId(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> Aggiungi
                    </button>
                </form>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Nome</th>
                                <th style={{ padding: '0.75rem' }}>Chat ID</th>
                                <th style={{ padding: '0.75rem' }}>Stato</th>
                                <th style={{ padding: '0.75rem' }}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>Caricamento...</td>
                                </tr>
                            ) : subscribers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Nessun tecnico configurato per le notifiche.
                                    </td>
                                </tr>
                            ) : (
                                subscribers.map((sub) => (
                                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={{ padding: '0.75rem' }}>
                                            <div style={{ fontWeight: 600 }}>{sub.nome}</div>
                                            {sub.isOwner && <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)' }}>OWNER</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{sub.chatId}</td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div 
                                                    onClick={() => toggleActive(sub)}
                                                    style={{
                                                        width: '40px',
                                                        height: '20px',
                                                        background: sub.attivo ? 'var(--success-color)' : 'var(--text-muted)',
                                                        borderRadius: '10px',
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        background: 'white',
                                                        borderRadius: '50%',
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: sub.attivo ? '22px' : '2px',
                                                        transition: 'left 0.2s'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.85rem' }}>{sub.attivo ? 'Attivo' : 'Disattivo'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <button 
                                                onClick={() => handleDelete(sub.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                                                title="Elimina"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
