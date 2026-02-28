import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import CryptoJS from 'crypto-js';

interface ActivationContextType {
    isActivated: boolean;
    loading: boolean;
    error: string | null;
}

const ActivationContext = createContext<ActivationContextType>({ isActivated: false, loading: true, error: null });

export const useActivation = () => useContext(ActivationContext);

const APP_SEED = 'A1b2C3d4E5f6G7h8I9j0_AssistenzaSK';
const MASTER_SECRET = 'Sup3rS3cr3t_M4st3r_K3y_99!';

export const ActivationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActivated, setIsActivated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [inputCode, setInputCode] = useState('');
    const [verifying, setVerifying] = useState(false);

    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    // 1. Genera il Request Hash
    const hwidRaw = `${projectId}|${APP_SEED}`;
    const requestHash = CryptoJS.SHA256(hwidRaw).toString(CryptoJS.enc.Hex).substring(0, 16).toUpperCase();

    // Mostriamo in forma ABCD-EFGH-IJKL-MNOP
    const displayRequestHash = requestHash.match(/.{1,4}/g)?.join('-') || requestHash;

    // 2. Calcola quello atteso
    const verifyRaw = `${requestHash}|${MASTER_SECRET}`;
    const expectedVerifyCode = CryptoJS.SHA256(verifyRaw).toString(CryptoJS.enc.Hex).substring(0, 20).toUpperCase();
    const formattedExpectedCode = expectedVerifyCode.match(/.{1,5}/g)?.join('-') || expectedVerifyCode;

    useEffect(() => {
        const checkActivation = async () => {
            try {
                const licenseDocRef = doc(db, 'system_config', 'activation');
                const licenseDoc = await getDoc(licenseDocRef);

                if (licenseDoc.exists()) {
                    const savedToken = licenseDoc.data().token;
                    // Togliamo eventuali trattini e spazi dal token salvato per il confronto
                    const cleanSaved = savedToken?.replace(/[^A-Z0-9]/g, '');
                    const cleanExpected = formattedExpectedCode.replace(/[^A-Z0-9]/g, '');

                    if (cleanSaved === cleanExpected) {
                        setIsActivated(true);
                    }
                }
            } catch (err: any) {
                console.error("Errore verifica attivazione:", err);
                setError(`Errore interno: ${err.message || String(err)}`);
            } finally {
                setLoading(false);
            }
        };

        checkActivation();
    }, [formattedExpectedCode]);

    const handleActivate = async () => {
        setVerifying(true);
        setError(null);
        try {
            const cleanInput = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cleanExpected = formattedExpectedCode.replace(/[^A-Z0-9]/g, '');

            if (cleanInput === cleanExpected) {
                // Salva nel db
                const licenseDocRef = doc(db, 'system_config', 'activation');
                await setDoc(licenseDocRef, { token: formattedExpectedCode, activatedAt: Date.now() });
                setIsActivated(true);
            } else {
                setError("Codice di sblocco non valido.");
            }
        } catch (err: any) {
            console.error("Errore salvataggio attivazione:", err);
            setError("Errore durante il salvataggio dell'attivazione.");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>Verifica attivazione di sistema...</div>;
    }

    if (!isActivated) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                    <h2 style={{ color: '#b91c1c', marginBottom: '1rem' }}>Sblocco Sistema Richiesto</h2>
                    <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.5' }}>
                        Questa installazione deve essere autenticata per poter funzionare.
                    </p>

                    <div style={{ padding: '1.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #cbd5e1' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>CODICE RICHIESTA</p>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '2px', color: '#0f172a', userSelect: 'all' }}>
                            {displayRequestHash}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                            Comunica questo codice allo sviluppatore.
                        </p>
                    </div>

                    <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Codice di Sblocco</label>
                        <input
                            type="text"
                            placeholder="ES. ABCDE-FGHIJ-KLMNO-PQRST"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1', letterSpacing: '1px', textTransform: 'uppercase' }}
                        />
                    </div>

                    {error && (
                        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleActivate}
                        disabled={!inputCode || verifying}
                        style={{ width: '100%', padding: '0.875rem', backgroundColor: (!inputCode || verifying) ? '#94a3b8' : '#2563eb', color: 'white', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: (!inputCode || verifying) ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
                    >
                        {verifying ? 'Verifica in corso...' : 'Sblocca Sistema'}
                    </button>

                </div>
            </div>
        );
    }

    return <ActivationContext.Provider value={{ isActivated, loading, error }}>{children}</ActivationContext.Provider>;
};
