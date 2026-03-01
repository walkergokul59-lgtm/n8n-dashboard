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
        return localStorage.getItem('n8nDataSource') || 'realtime-mockup'; // 'mockup', 'realtime-mockup', 'n8n-api'
    });

    const [apiUrl, setApiUrl] = useState(() => {
        return localStorage.getItem('n8nApiUrl') || 'http://localhost:5678/api/v1';
    });

    const [apiKey, setApiKey] = useState(() => {
        return localStorage.getItem('n8nApiKey') || '';
    });

    // Sync state changes back to localStorage automatically
    useEffect(() => {
        localStorage.setItem('n8nDataSource', dataSource);
    }, [dataSource]);

    useEffect(() => {
        localStorage.setItem('n8nApiUrl', apiUrl);
    }, [apiUrl]);

    useEffect(() => {
        localStorage.setItem('n8nApiKey', apiKey);
    }, [apiKey]);

    // Construct the context shape exposing states and their setters
    const contextValue = {
        dataSource,
        setDataSource,
        apiUrl,
        setApiUrl,
        apiKey,
        setApiKey,
    };

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};
