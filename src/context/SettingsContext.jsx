import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Context Object
const SettingsContext = createContext();

// Custom hook for consuming the Settings Context
export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// Provider Component
export const SettingsProvider = ({ children }) => {
    // Determine initial state from localStorage, or default to realtime mockups
    const [dataSource, setDataSource] = useState(() => {
        const stored = localStorage.getItem('n8nDataSource');
        if (stored === 'n8n-api') return 'n8n-server'; // migrate old value
        return stored || 'realtime-mockup'; // 'mockup', 'realtime-mockup', 'n8n-server'
    });

    // Sync state changes back to localStorage automatically
    useEffect(() => {
        localStorage.setItem('n8nDataSource', dataSource);
    }, [dataSource]);

    // Construct the context shape exposing states and their setters
    const contextValue = {
        dataSource,
        setDataSource,
    };

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};
