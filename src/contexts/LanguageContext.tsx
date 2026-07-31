import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import translations, { Language, TranslationKey } from '../i18n/translations';

const LS_KEY = 'user-language';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'it',
    setLanguage: () => {},
    t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useSettings();

    // Priority: localStorage > settings.language > 'it'
    const resolveLanguage = (): Language => {
        const saved = localStorage.getItem(LS_KEY) as Language | null;
        if (saved === 'it' || saved === 'en' || saved === 'fr') return saved;
        const adminLang = (settings as any).language as Language | undefined;
        if (adminLang === 'it' || adminLang === 'en' || adminLang === 'fr') return adminLang;
        return 'it';
    };

    const [language, setLanguageState] = useState<Language>(resolveLanguage);

    // When admin changes the default language in settings, re-evaluate
    useEffect(() => {
        const currentOverride = localStorage.getItem(LS_KEY);
        // Only follow the admin's setting if the user hasn't set their own preference
        if (!currentOverride) {
            const adminLang = (settings as any).language as Language | undefined;
            if (adminLang === 'it' || adminLang === 'en' || adminLang === 'fr') {
                setLanguageState(adminLang);
            }
        }
    }, [(settings as any).language]);

    const setLanguage = useCallback((lang: Language) => {
        localStorage.setItem(LS_KEY, lang);
        setLanguageState(lang);
    }, []);

    const t = useCallback(
        (key: TranslationKey, fallback?: string): string => {
            const dict = translations[language] as Record<string, string>;
            return dict[key] ?? (translations['it'] as Record<string, string>)[key] ?? fallback ?? key;
        },
        [language]
    );

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
