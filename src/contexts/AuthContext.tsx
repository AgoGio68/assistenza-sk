import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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
                        setUserProfile(docSnap.data() as UserProfile);
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
