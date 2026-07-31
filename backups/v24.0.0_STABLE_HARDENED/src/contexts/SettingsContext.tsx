import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GlobalSettings } from '../types';

const baseDefaultSettings: Partial<GlobalSettings> = {
    primaryColor: '#0f172a' /* Default slate-900 */,
    secondaryColor: '#3b82f6' /* Default blue-500 */,
    logoUrl: '',
    appName: 'ASSISTENZA SK',
    visibilityMode: 'all',
    layoutMode: 'default',
    applyCompactToAll: false,
    allowUserTicketCreation: true,
    enablePhotos: false,
    serialPrefix: '',
    installationModules: [
        'OCMSKD20101 - Upgrade 1 Monitoring channel CPX',
        'OCMSKD20202 - Multiple tool counter CPX [x1]',
        'OCMSKD20301 - Monit-module triple profile CPX [x1]',
        'OCMSKD20304 - Monitoring-module peak force CPX [x1]',
        'OCMSKD20309 - Monit-module: rollback check CPX [x1]',
        'OCMSKD20401 - Part data management CPX [x1]',
        'OCMSKD20402 - User administration CPX [x1]',
        'OCMSKD20405 - DMI CPX [x1]',
        'OCMSKD20406 - PTO xpress CPX [x1]',
        'OCMSKD20408 - Screenshot to USB CPX [x1]',
        'OCMSKD20305 - TESTA ROTATA',
        'OCMSKD20309 - ROLLBACK',
        'OCMSKD20601  - RAIS CPX',
    ],
    adminCanAssignAtCreation: true,
    adminCanReassignOthers: false,
    adminCanCloseOthers: false,
    userCanAssignAtCreation: false,
    userCanCloseOwnTickets: true,
    whatsappEnabled: false, // v3.3.1: disabilitato di default — richiede ok amministrazione
};

export const STANDARD_RP_CHECKLIST = [
    'PRIMA COSA ATTIVARE DMI IN VALORI DI MISURA E CARATTERE',
    'ATTIVARE DMI IBRIDO',
    'DMI CON FUNZIONE DI TASTO "0"',
    'CH1 INGRESSO SUPERIORE POSIZIONE DMI "1" GRUPPO H25',
    'CH2 INGRESSO INFERIORE  POSIZIONE DMI "S" GRUPPO H25',
    'CH3 USCITA SUPERIORE      POSIZIONE DMI "S" GRUPPO H25',
    'CH4 CUNEO  POSIZIONE DMI "D1" HIDE AND E = "0"',
    'CH5 CUNEO  POSIZIONE DMI "D2" HIDE AND E = "0"',
    'IN2 : RICHIESTA DI SCARTO ESTERNO',
    'OUT-BDE2 CONTEGGIO PEZZI BUONI',
    'ATTIVARE CONTEGGIO IN MAN',
    'ATTIVARE COLPO A VUOTO',
    'TOLLERANZA SCARTO 3',
    'PEZZI DA SCARTARE +2/3',
    'ATTIVARE SCARTO IN STOP',
    'ATTIVARE ROLLBACK E METTERE A "1"',
    'ENTRARE NELLA CURVA ROLLBACK PREMERE IMPOSTAZIONI:',
    '(ZOOM-CH SENS MIN "1")',
    '(IN VISUALIZZAZIONE NASCONDERE IL CANALE)',
    'SINCRONIZZAZIONE PROXIMITY NEGATIVO SE PIASTRINA NON PRESENTE',
    'INSERIRE INDIRIZZO IP 192.168.0.210',
    'SALVARE I PARAMETRI A FINE PROGRAMMAZIONE',
    'ESPORTA BACKUP',
    'IMPORTANDO IL BACKUP RIMETTERE INDIRIZZO IP',
];

const defaultSettings: GlobalSettings = {
    ...baseDefaultSettings,
    collaudoChecklists: {
        rp: STANDARD_RP_CHECKLIST,
        sp: [],
        c1: { title: 'Custom 1', items: [] },
        c2: { title: 'Custom 2', items: [] },
        c3: { title: 'Custom 3', items: [] },
        c4: { title: 'Custom 4', items: [] },
    }, // v3.4.0
    navIconColors: {
        dashboard: '#3b82f6',
        calendar: '#10b981',
        tickets: '#f59e0b',
        installations: '#06b6d4',
        profile: '#8b5cf6',
        create: '#ec4899',
        admin: '#6366f1',
        rapportini: '#14b8a6',
        logout: '#f43f5e',
    },
    language: 'it' as 'it' | 'en' | 'fr',
};

interface SettingsContextType {
    settings: GlobalSettings;
    updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: async () => {},
    loading: true,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as GlobalSettings;
                    setSettings({ ...defaultSettings, ...data });

                    // Assicura di applicare istantaneamente le variabili scritte a database al documento CSS root
                    const root = document.documentElement;
                    if (data.primaryColor) root.style.setProperty('--primary-color', data.primaryColor);
                    if (data.secondaryColor) root.style.setProperty('--secondary-color', data.secondaryColor);
                    // v4.6.1: Aggiornamento versione automatico
                    // Se la versione in Firestore è diversa da quella del bundle,
                    // aggiorna silenziosamente Firestore (non fare reload — evita loop).
                    const isPublicSheet = window.location.pathname.startsWith('/sheet');
                    const bundleVersion = (window as any).__APP_VERSION__;
                    if (!isPublicSheet && bundleVersion && data.version && data.version !== bundleVersion) {
                        console.log(`[SettingsContext] Versione Firestore (${data.version}) → Aggiorno a bundle (${bundleVersion}).`);
                        setDoc(docRef, { version: bundleVersion }, { merge: true }).catch(console.error);
                    }
                } else {
                    setDoc(docRef, { ...defaultSettings, version: (window as any).__APP_VERSION__ || '3.9.7' }).catch(console.error);
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching settings:', err);
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, []);

    const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
        try {
            const docRef = doc(db, 'settings', 'global');
            const version = (window as any).__APP_VERSION__ || '3.9.7';
            
            // Remove undefined values to prevent Firestore errors
            const sanitizedSettings = { ...newSettings };
            Object.keys(sanitizedSettings).forEach(key => {
                if ((sanitizedSettings as any)[key] === undefined) {
                    delete (sanitizedSettings as any)[key];
                }
            });
            
            await setDoc(docRef, { ...sanitizedSettings, version }, { merge: true });
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    };

    if (loading)
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Caricamento impostazioni globali...
            </div>
        );

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>{children}</SettingsContext.Provider>
    );
};
