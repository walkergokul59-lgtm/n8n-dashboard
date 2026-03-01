import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

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
    const { dataSource, apiUrl, apiKey } = useSettings();
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

        return new Promise(async (resolve, reject) => {
            try {
                if (dataSource === 'n8n-api') {
                    // LIVE API FETCH ROUTE
                    const response = await fetch(`${apiUrl}${endpointPath}`, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`n8n API Error: ${response.status} ${response.statusText}`);
                    }

                    const result = await response.json();
                    setData(result);
                    resolve(result);

                } else {
                    // MOCK ROUTES
                    const timeoutMs = dataSource === 'mockup' ? 0 : 300; // 'mockup' instantly resolves

                    setTimeout(() => {
                        const result = fetcherFn();
                        setData(result);
                        resolve(result);
                    }, timeoutMs);
                }
            } catch (err) {
                setError(err);
                reject(err);
            } finally {
                setIsLoading(false);
                setIsRefetching(false);
            }
        });
    }, [fetcherFn, dataSource, apiUrl, apiKey, endpointPath]);

    // Initial mount fetch
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
