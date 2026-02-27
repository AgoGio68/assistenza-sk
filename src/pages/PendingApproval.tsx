import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock } from 'lucide-react';

export const PendingApproval: React.FC = () => {
    const { logout, isApproved } = useAuth();
    const navigate = useNavigate();
    const appName = import.meta.env.VITE_APP_NAME || 'ASSISTENZA SK';

    useEffect(() => {
        if (isApproved) {
            navigate('/');
        }
    }, [isApproved, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem', backgroundColor: 'var(--bg-color)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{appName}</h2>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--warning-color)' }}>
                    <Clock size={48} />
                </div>

                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>In attesa di approvazione</h3>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Il tuo account è stato creato con successo ma deve essere approvato da un amministratore prima che tu possa accedere al sistema.
                </p>

                <button
                    onClick={() => logout()}
                    className="btn"
                    style={{ width: '100%', border: '1px solid var(--text-secondary)' }}
                >
                    <LogOut size={20} /> Torna al Login
                </button>
            </div>
        </div>
    );
};
