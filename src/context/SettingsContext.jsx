/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

// Create the Context Object
const SettingsContext = createContext();
const DATASOURCE_KEY = 'n8nDataSource';
const PROFILE_KEY = 'n8nClientProfile';
const LIVE_DATASOURCE = 'n8n-server';

const EMPTY_PROFILE = {
    clientName: '',
    contactNumber: '',
    businessName: '',
    primaryEmail: '',
    secondaryEmail: '',
    profileImage: '',
};

const readProfileFromStorage = () => {
    try {
        const stored = localStorage.getItem(PROFILE_KEY);
        if (!stored) return EMPTY_PROFILE;
        const parsed = JSON.parse(stored);
        return { ...EMPTY_PROFILE, ...parsed };
    } catch {
        return EMPTY_PROFILE;
    }
};

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
    // Live n8n is now enforced as the default/active source.
    const [dataSource, setDataSourceState] = useState(LIVE_DATASOURCE);
    const [clientProfile, setClientProfileState] = useState(readProfileFromStorage);

    useEffect(() => {
        localStorage.setItem(DATASOURCE_KEY, LIVE_DATASOURCE);
    }, []);

    const setDataSource = useCallback(() => {
        setDataSourceState(LIVE_DATASOURCE);
        localStorage.setItem(DATASOURCE_KEY, LIVE_DATASOURCE);
    }, []);

    const setClientProfile = useCallback((nextProfile) => {
        const resolvedProfile = typeof nextProfile === 'function'
            ? nextProfile(clientProfile)
            : nextProfile;
        const normalizedProfile = { ...EMPTY_PROFILE, ...resolvedProfile };

        localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile));
        setClientProfileState(normalizedProfile);
    }, [clientProfile]);

    const contextValue = useMemo(() => ({
        dataSource,
        setDataSource,
        clientProfile,
        setClientProfile,
    }), [dataSource, setDataSource, clientProfile, setClientProfile]);

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};
