/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

// Create the Context Object
const SettingsContext = createContext();
const DATASOURCE_KEY = 'n8nDataSource';
const PROFILE_KEY = 'n8nClientProfile';
const THEME_KEY = 'n8nTheme';
const LIVE_DATASOURCE = 'n8n-server';

const EMPTY_PROFILE = {
    clientName: '',
    contactCountryCode: '+91',
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
    const [theme, setThemeState] = useState(() => {
        try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
    });
    const { user, apiFetch, isLoading: isAuthLoading } = useAuth();
    const lastFetchedUserId = useRef(null);
    const [isProfileReady, setIsProfileReady] = useState(false);

    // Eagerly fetch client profile when user changes (fixes stale avatar on login)
    useEffect(() => {
        const userId = user?.id || '';
        const userRole = user?.role || '';

        // Admin or no user — no profile to fetch, mark ready immediately
        if (!userId || userRole === 'admin') {
            if (lastFetchedUserId.current) {
                setClientProfileState(EMPTY_PROFILE);
                localStorage.removeItem(PROFILE_KEY);
                lastFetchedUserId.current = null;
            }
            setIsProfileReady(true);
            return;
        }

        // Skip if already fetched for this user
        if (lastFetchedUserId.current === userId) return;

        // Still loading auth — wait
        if (isAuthLoading) {
            setIsProfileReady(false);
            return;
        }

        setIsProfileReady(false);
        let cancelled = false;
        (async () => {
            try {
                const response = await apiFetch('/api/client/settings', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok || cancelled) return;
                const payload = await response.json();
                const profile = payload?.profile || {};
                if (cancelled) return;
                const normalized = { ...EMPTY_PROFILE, ...profile };
                setClientProfileState(normalized);
                localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
                lastFetchedUserId.current = userId;
            } catch {
                // Mark ready even on error so the app doesn't hang
            } finally {
                if (!cancelled) setIsProfileReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, [user?.id, user?.role, isAuthLoading, apiFetch]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, next);
            return next;
        });
    }, []);

    useEffect(() => {
        localStorage.setItem(DATASOURCE_KEY, LIVE_DATASOURCE);
    }, []);

    const setDataSource = useCallback(() => {
        setDataSourceState(LIVE_DATASOURCE);
        localStorage.setItem(DATASOURCE_KEY, LIVE_DATASOURCE);
    }, []);

    const setClientProfile = useCallback((nextProfile) => {
        setClientProfileState((previous) => {
            const resolvedProfile = typeof nextProfile === 'function'
                ? nextProfile(previous)
                : nextProfile;
            const normalizedProfile = { ...EMPTY_PROFILE, ...resolvedProfile };
            localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile));
            return normalizedProfile;
        });
    }, []);

    const contextValue = useMemo(() => ({
        dataSource,
        setDataSource,
        clientProfile,
        setClientProfile,
        theme,
        toggleTheme,
        isProfileReady,
    }), [dataSource, setDataSource, clientProfile, setClientProfile, theme, toggleTheme, isProfileReady]);

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};
