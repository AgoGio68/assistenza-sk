import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
    /** true se il safety timeout è scattato (connessione lenta o assente) */
    isOffline: boolean;
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
    // UX-02: stato per banner offline
    const [isOffline, setIsOffline] = useState(false);

    // ROB-01: useRef per gestire il listener del profilo in modo sicuro
    // evita race condition tra operazioni async e cleanup
    const profileUnsubRef = useRef<() => void>(() => {});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // ROB-01: cancella sempre il listener precedente prima di crearne uno nuovo
            profileUnsubRef.current();
            profileUnsubRef.current = () => {};

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

                    // ROB-01: salva il nuovo unsubscribe nel ref — sempre chiamabile
                    profileUnsubRef.current = onSnapshot(
                        userDocRef,
                        (docSnap) => {
                            if (docSnap.exists()) {
                                const data = docSnap.data() as UserProfile;
                                setUserProfile(data);
                            }
                            setLoading(false);
                        },
                        (error) => {
                            console.error('[Auth] Errore snapshot profilo:', error);
                            setLoading(false);
                        },
                    );
                } catch (error) {
                    console.error('[Auth] Errore fetch profilo iniziale:', error);
                    setLoading(false);
                }
            } else {
                setUserProfile(null);

                // LOGIN ANONIMO AUTOMATICO (solo per percorsi pubblici /sheet/...)
                const isPublicRoute = window.location.pathname.startsWith('/sheet/');
                if (isPublicRoute) {
                    try {
                        console.log('[Auth] Avvio login anonimo per risorsa pubblica...');
                        await signInAnonymously(auth);
                    } catch (error) {
                        console.error('[Auth] Errore login anonimo:', error);
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            }

        });

        // UX-02: Safety timeout — se dopo 8 secondi siamo ancora in loading,
        // sblocchiamo la UI e mostriamo il banner offline/lento
        const safetyTimeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn('[Auth] Safety timeout attivato - Sblocco loading forzato.');
                    setIsOffline(true);
                }
                return false;
            });
        }, 8000);

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
            // ROB-01: cleanup sempre sicuro grazie al ref
            profileUnsubRef.current();
        };
    }, []);

    const logout = () => {
        return signOut(auth);
    };

    const isSuperadmin = userProfile?.role === 'superadmin';
    const isAdmin = userProfile?.role === 'admin' || isSuperadmin;
    const isApproved = userProfile?.status === 'approved' || userProfile?.role === 'admin' || isSuperadmin;
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
        isOffline,
        logout,
        isSuperadmin,
        isAdmin,
        isApproved,
        updateDisplayName,
        updatePhone,
        userSections,
        canAccessInstallations: isAdmin || Boolean(userProfile?.canAccessInstallations),
    };


    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
