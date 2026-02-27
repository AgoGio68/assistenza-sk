import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signOut
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

    // Debug log to trace what AuthContext thinks the user status is
    useEffect(() => {
        if (userProfile) {
            console.log("Current User Profile State:", userProfile);
        }
    }, [userProfile]);

    const value = {
        currentUser,
        userProfile,
        loading,
        logout,
        isSuperadmin,
        isAdmin,
        isApproved
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
