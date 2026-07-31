import React, { createContext, useContext, useState } from 'react';

interface ActivationContextType {
    isActivated: boolean;
    loading: boolean;
    error: string | null;
}

const ActivationContext = createContext<ActivationContextType>({ isActivated: false, loading: true, error: null });

export const useActivation = () => useContext(ActivationContext);

export const ActivationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // v3.9.8: License check disabled for now per user request
    const [isActivated] = useState(true);
    const [loading] = useState(false);
    const [error] = useState<string | null>(null);

    return <ActivationContext.Provider value={{ isActivated, loading, error }}>{children}</ActivationContext.Provider>;
};
