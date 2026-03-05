import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface GlobalSettings {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    appName: string;
    // New v1.5.1 Settings
    visibilityMode: 'all' | 'assigned_only';
    layoutMode: 'default' | 'compact';
    applyCompactToAll: boolean;
    allowUserTicketCreation: boolean;
    // New v1.8 Settings
    enablePhotos: boolean;
    // New v1.9 Settings
    enableInstallations: boolean;
    installationsSheetUrl: string;
    serialPrefix: string;
    // New v2.1.0 Permissions Settings
    adminCanAssignAtCreation: boolean;
    adminCanReassignOthers: boolean;
    adminCanCloseOthers: boolean;
    userCanAssignAtCreation: boolean;
    userCanCloseOwnTickets: boolean;
}

const defaultSettings: GlobalSettings = {
    primaryColor: '#0f172a', /* Default slate-900 */
    secondaryColor: '#3b82f6', /* Default blue-500 */
    logoUrl: '',
    appName: 'ASSISTENZA SK',
    visibilityMode: 'all',
    layoutMode: 'default',
    applyCompactToAll: false,
    allowUserTicketCreation: true,
    enablePhotos: false,
    enableInstallations: false,
    installationsSheetUrl: '',
    serialPrefix: '',
    adminCanAssignAtCreation: true,
    adminCanReassignOthers: false,
    adminCanCloseOthers: false,
    userCanAssignAtCreation: false,
    userCanCloseOwnTickets: true
};

interface SettingsContextType {
    settings: GlobalSettings;
    updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: async () => { },
    loading: true
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as GlobalSettings;
                setSettings({ ...defaultSettings, ...data });

                // Assicura di applicare istantaneamente le variabili scritte a database al documento CSS root
                const root = document.documentElement;
                if (data.primaryColor) root.style.setProperty('--primary-color', data.primaryColor);
                if (data.secondaryColor) root.style.setProperty('--secondary-color', data.secondaryColor);
            } else {
                setDoc(docRef, defaultSettings).catch(console.error);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching settings:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
        try {
            const docRef = doc(db, 'settings', 'global');
            await setDoc(docRef, newSettings, { merge: true });
        } catch (error) {
            console.error("Failed to update settings:", error);
            throw error;
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Caricamento impostazioni globali...</div>;

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};
