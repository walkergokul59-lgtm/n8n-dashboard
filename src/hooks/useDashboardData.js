import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/useAuth';

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Custom hook to simulate fetching data from an API with loading states,
 * refetching capabilities, and mock error handling.
 * 
 * @param {Function} fetcherFn - The mock data generator function to call.
 * @param {number} delayMs - Simulated network delay in milliseconds.
 * @param {number} errorProbability - Probability (0.0 to 1.0) of a simulated error.
 * @returns {Object} - { data, isLoading, isRefetching, error, refetch }
 */
export const useDashboardData = (fetcherFn, endpointPath = '') => {
    const { dataSource } = useSettings();
    const { apiFetch } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (isBackgroundSync = false) => {
        if (!isBackgroundSync) {
            setIsLoading(true);
        } else {
            setIsRefetching(true);
        }

        setError(null);
        try {
            if (dataSource === 'n8n-server' && endpointPath) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

                // LIVE (SERVER-SIDE) ROUTE - token stays on the server
                const response = await apiFetch(`/api${endpointPath}`, {
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal,
                }).finally(() => {
                    clearTimeout(timeoutId);
                });

                if (!response.ok) {
                    throw new Error(`Dashboard API Error: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                setData(result);
                return result;
            }

            // MOCK ROUTES
            const timeoutMs = dataSource === 'mockup' ? 0 : 300; // 'mockup' instantly resolves
            if (timeoutMs) {
                await new Promise((r) => setTimeout(r, timeoutMs));
            }
            const result = fetcherFn();
            setData(result);
            return result;
        } catch (err) {
            if (err?.name === 'AbortError') {
                setError(new Error('Dashboard request timed out. Please try refreshing data.'));
                return null;
            }

            setError(err instanceof Error ? err : new Error(String(err)));
            return null;
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [fetcherFn, dataSource, endpointPath, apiFetch]);

    // Initial mount fetch & refetch when dependencies change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Provide a manual refetch wrapper for the consumer
    const refetch = useCallback(() => {
        return fetchData(true); // background sync true
    }, [fetchData]);

    return {
        data,
        isLoading,
        isRefetching,
        error,
        refetch
    };
};
