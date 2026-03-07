import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context';
const TOKEN_KEY = 'n8nDashboardAuthToken';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const apiFetch = useCallback(async (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return fetch(input, { ...init, headers, cache: 'no-store' });
    }, [token]);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
    }, []);

    const saveSession = useCallback((payload) => {
        const nextToken = String(payload?.token || '');
        localStorage.setItem(TOKEN_KEY, nextToken);
        setToken(nextToken);
        setUser(payload?.user || null);
        return payload?.user || null;
    }, []);

    const login = useCallback(async (email, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email, password }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'Login failed');
        }

        const payload = await response.json();
        return saveSession(payload);
    }, [saveSession]);

    const signup = useCallback(async ({ email, password, clientName }) => {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email, password, clientName }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'Signup failed');
        }

        const payload = await response.json();
        return saveSession(payload);
    }, [saveSession]);

    const authenticateWithGoogle = useCallback(async ({ credential, mode, clientName }) => {
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ credential, mode, clientName }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'Google authentication failed');
        }

        const payload = await response.json();
        return saveSession(payload);
    }, [saveSession]);

    const loginWithGoogle = useCallback(async (credential) => {
        return authenticateWithGoogle({ credential, mode: 'signin' });
    }, [authenticateWithGoogle]);

    const signupWithGoogle = useCallback(async ({ credential, clientName }) => {
        return authenticateWithGoogle({ credential, mode: 'signup', clientName });
    }, [authenticateWithGoogle]);

    const refreshUser = useCallback(async () => {
        if (!token) {
            setUser(null);
            return null;
        }
        const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Session expired');
        const payload = await res.json();
        setUser(payload?.user || null);
        return payload?.user || null;
    }, [token]);

    useEffect(() => {
        let mounted = true;
        const verify = async () => {
            if (!token) {
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
                return;
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                    cache: 'no-store',
                    signal: controller.signal,
                }).finally(() => {
                    clearTimeout(timeoutId);
                });
                if (!res.ok) throw new Error('Session expired');
                const payload = await res.json();
                if (mounted) setUser(payload?.user || null);
            } catch {
                if (mounted) logout();
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        void verify();
        return () => {
            mounted = false;
        };
    }, [token, logout]);

    const value = useMemo(() => ({
        token,
        user,
        isLoading,
        isAuthenticated: Boolean(user && token),
        isAdmin: user?.role === 'admin',
        isApproved: user?.role === 'admin' || user?.approvalStatus === 'approved',
        login,
        signup,
        loginWithGoogle,
        signupWithGoogle,
        refreshUser,
        logout,
        apiFetch,
    }), [token, user, isLoading, login, signup, loginWithGoogle, signupWithGoogle, refreshUser, logout, apiFetch]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
