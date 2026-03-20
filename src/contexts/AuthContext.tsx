import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    linkWithPopup,
    reauthenticateWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, messaging } from '../firebase';
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
    connectGoogle: () => Promise<string | null>;
    signInWithGoogle: () => Promise<void>;
    disconnectGoogle: () => void;
    googleToken: string | null;
    userSections: ('sk' | 's2')[];
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
                const userDoc = await getDoc(userDocRef);
                if (!userDoc.exists()) {
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email?.split('@')[0] || 'User',
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

                        // Richiedi notifiche push per admin/superadmin approvati
                        if ((data.role === 'admin' || data.role === 'superadmin') && data.status === 'approved' && messaging) {
                            Notification.requestPermission().then((permission) => {
                                if (permission === 'granted') {
                                    getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
                                        .then((token) => {
                                            if (token && token !== data.fcmToken) {
                                                console.log("Nuovo token FCM generato e salvato.");
                                                updateDoc(userDocRef, { fcmToken: token });
                                            }
                                        }).catch(console.error);
                                }
                            });
                        }
                    }
                    setLoading(false); // <--- Imposto loading=false SOLO DOPO aver caricato il profilo
                });

            } else {
                setUserProfile(null);
                if (userProfileUnsubscribe) userProfileUnsubscribe();
                setLoading(false); // <--- Se non c'è utente, ok loading false immediato
            }
        });

        return () => {
            unsubscribe();
            if (userProfileUnsubscribe) userProfileUnsubscribe();
        };
    }, []);

    const logout = () => {
        return signOut(auth);
    };

    const isSuperadmin = userProfile?.role === 'superadmin';
    const isAdmin = userProfile?.role === 'admin' || isSuperadmin;
    const isApproved = userProfile?.status === 'approved' || isSuperadmin;
    const userSections: ('sk' | 's2')[] = isSuperadmin 
        ? ['sk', 's2'] 
        : (userProfile?.sections || ['sk']);

    const updateDisplayName = async (newName: string) => {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { displayName: newName });
    };

    const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_calendar_token'));

    // Tentativo di rilevamento automatico per utenti Google
    useEffect(() => {
        if (!currentUser || googleToken) return;
        const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
        if (isGoogleUser) {
            console.log("Utente Google rilevato senza token attivo. Il sistema tenterà il collegamento fluido alla prima azione necessaria.");
        }
    }, [currentUser, googleToken]);


    const connectGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/calendar.events');
            provider.addScope('https://www.googleapis.com/auth/spreadsheets');
            // provider.setCustomParameters({ prompt: 'consent' }); // rimosso per login automatico


            if (!currentUser) {
                alert("Devi essere loggato per collegare Google.");
                return null;
            }

            let token: string | undefined = undefined;

            const isGoogleLinked = currentUser.providerData.some(p => p.providerId === 'google.com');

            try {
                if (isGoogleLinked) {
                    const result = await reauthenticateWithPopup(currentUser, provider);
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    token = credential?.accessToken;
                } else {
                    const result = await linkWithPopup(currentUser, provider);
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    token = credential?.accessToken;
                }
            } catch (err: any) {
                if (err.code === 'auth/credential-already-in-use') {
                    // L'account Google è già usato da un'altra entità Firebase.
                    // Poiché ci serve solo il Token OAuth per le chiamate API Calendar/Sheets, 
                    // estraiamo pacificamente le credenziali dall'errore, senza loggare l'utente fuori/dentro.
                    const credential = GoogleAuthProvider.credentialFromError(err);
                    token = credential?.accessToken;
                } else {
                    throw err;
                }
            }

            if (token) {
                setGoogleToken(token);
                localStorage.setItem('google_calendar_token', token);
                return token;
            }
            return null;
        } catch (error: any) {
            console.error("Error connecting to Google:", error);
            alert("Errore durante il collegamento a Google: " + (error.message || "Verifica la console del browser."));
            return null;
        }
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/calendar.events');
            provider.addScope('https://www.googleapis.com/auth/spreadsheets');
            // provider.setCustomParameters({ prompt: 'consent' }); // rimosso per login automatico


            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (token) {
                setGoogleToken(token);
                localStorage.setItem('google_calendar_token', token);
            }
        } catch (error: any) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    const disconnectGoogle = () => {
        setGoogleToken(null);
        localStorage.removeItem('google_calendar_token');
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
        connectGoogle,
        signInWithGoogle,
        disconnectGoogle,
        googleToken,
        userSections
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
