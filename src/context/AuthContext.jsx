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
        return fetch(input, { ...init, headers });
    }, [token]);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
    }, []);

    const login = useCallback(async (email, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'Login failed');
        }

        const payload = await response.json();
        const nextToken = String(payload?.token || '');
        localStorage.setItem(TOKEN_KEY, nextToken);
        setToken(nextToken);
        setUser(payload?.user || null);
        return payload?.user || null;
    }, []);

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
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
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
        login,
        logout,
        apiFetch,
    }), [token, user, isLoading, login, logout, apiFetch]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
