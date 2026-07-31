import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signOut,
    signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
    currentUser: FirebaseUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
    isSuperadmin: boolean;
    isAdmin: boolean;
    isApproved: boolean;
    updateDisplayName: (newName: string) => Promise<void>;
    updatePhone: (newPhone: string) => Promise<void>;
    userSections: ('sk' | 's2')[];
    canAccessInstallations: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let userProfileUnsubscribe: () => void;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                const userDocRef = doc(db, 'users', user.uid);

                // Fetch iniziale o creazione
                try {
                    const userDoc = await getDoc(userDocRef);
                    if (!userDoc.exists()) {
                        // VALIDAZIONE RIGOROSA (Fix Ghost Records)
                        // Non creiamo un profilo se l'email è mancante (es. utenti anonimi o sessioni parziali)
                        if (!user.email || user.email.trim() === '') {
                            console.warn('[Auth] Utente anonimo rilevato (o senza email) UID:', user.uid);
                            setLoading(false);
                            return;
                        }

                        const newProfile: UserProfile = {
                            uid: user.uid,
                            email: user.email,
                            displayName: (user.displayName || user.email.split('@')[0] || 'User').trim(),
                            role: 'user',
                            status: 'pending',
                            createdAt: Date.now(),
                        };
                        await setDoc(userDocRef, newProfile);
                    }

                    // Subscribe ai cambiamenti del profilo in tempo reale
                    userProfileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data() as UserProfile;
                            setUserProfile(data);
                        }
                        setLoading(false); 
                    }, (error) => {
                        console.error('[Auth] Errore snapshot profilo:', error);
                        setLoading(false);
                    });
                } catch (error) {
                    console.error('[Auth] Errore fetch profilo iniziale:', error);
                    setLoading(false);
                }
            } else {
                setUserProfile(null);
                if (userProfileUnsubscribe) userProfileUnsubscribe();
                
                // LOGIN ANONIMO AUTOMATICO
                // Se non c'è un utente loggato, attiviamo una sessione anonima
                // per permettere la visione delle pagine pubbliche (es. /sheet/ordini)
                try {
                    console.log('[Auth] Avvio login anonimo...');
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error('[Auth] Errore login anonimo:', error);
                    setLoading(false);
                }
            }
        });

        // Safety timeout: se dopo 8 secondi siamo ancora in loading, sblocchiamo comunque la UI
        // per evitare freeze infiniti su mobile in caso di problemi Auth/Firestore
        const safetyTimeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) console.warn('[Auth] Safety timeout attivato - Sblocco loading forzato.');
                return false;
            });
        }, 8000);

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
            if (userProfileUnsubscribe) userProfileUnsubscribe();
        };
    }, []);

    const logout = () => {
        return signOut(auth);
    };

    const isSuperadmin = userProfile?.role === 'superadmin';
    const isAdmin = userProfile?.role === 'admin' || isSuperadmin;
    const isApproved = userProfile?.status === 'approved' || isSuperadmin;
    const userSections: ('sk' | 's2')[] = isSuperadmin ? ['sk', 's2'] : userProfile?.sections || ['sk'];

    const updateDisplayName = async (newName: string) => {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { displayName: newName });
    };

    const updatePhone = async (newPhone: string) => {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { phone: newPhone });
    };

    const value = {
        currentUser,
        userProfile,
        loading,
        logout,
        isSuperadmin,
        isAdmin,
        isApproved,
        updateDisplayName,
        updatePhone,
        userSections,
        canAccessInstallations: isAdmin,
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
