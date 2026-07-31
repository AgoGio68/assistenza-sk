import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Cleanup: React.FC = () => {
    const { isSuperadmin } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<string>('Pronto per la pulizia.');
    const [loading, setLoading] = useState(false);

    // Doppia protezione: anche se la rotta fosse raggiunta, blocca chi non è superadmin
    if (!isSuperadmin) {
        return (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h2 style={{ color: '#dc2626' }}>⛔ Accesso Negato</h2>
                <p>Questa pagina è riservata ai Superadmin.</p>
                <button
                    onClick={() => navigate('/')}
                    style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer' }}
                >
                    Torna alla Home
                </button>
            </div>
        );
    }

    const runCleanup = async () => {
        setLoading(true);
        setStatus('Pulizia in corso...');
        try {
            const ref = doc(db, 'fogli_condivisi', 'ordini');
            
            // 1. Azzeramento dei Commenti (triangolini rossi invisibili)
            await updateDoc(ref, { comments: {} });
            
            // 2. Pulizia di eventuali scritte di test nelle celle
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data().data || {};
                const cleanData = { ...data };
                let changed = false;
                for (const [k, v] of Object.entries(cleanData)) {
                    const val = String(v);
                    if (val.includes('FIREBASE_CHECK') || val.includes('TEST NOTA') || val.includes('test model')) {
                        delete cleanData[k];
                        changed = true;
                    }
                }
                if (changed) {
                    await updateDoc(ref, { data: cleanData });
                }
            }

            setStatus('PULIZIA COMPLETATA CON SUCCESSO! Ora puoi tornare al foglio.');
        } catch (err: any) {
            console.error(err);
            setStatus('ERRORE: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>Strumento di Pulizia Database</h1>
            <p>Questo strumento eliminerà tutte le note di cella invisibili e i test dal foglio "Ordini".</p>
            <div style={{ margin: '40px 0', padding: 20, background: '#f8f9fa', borderRadius: 8 }}>
                <strong>Stato:</strong> {status}
            </div>
            <button 
                onClick={runCleanup} 
                disabled={loading}
                style={{
                    padding: '12px 24px',
                    fontSize: 16,
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                }}
            >
                {loading ? 'Pulizia in corso...' : 'AVVIA PULIZIA PROFONDA'}
            </button>
            <br/><br/>
            <a href="/sheet/ordini" style={{ color: '#2563eb' }}>Torna al Foglio Ordini</a>
        </div>
    );
};

