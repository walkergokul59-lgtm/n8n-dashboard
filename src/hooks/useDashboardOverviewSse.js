import { useEffect, useState } from "react";

export function useDashboardOverviewSse(enabled) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    let closed = false;
    const es = new EventSource("/api/dashboard/stream?intervalMs=3000");

    const onOverview = (e) => {
      if (closed) return;
      try {
        const parsed = JSON.parse(e.data);
        setData(parsed);
        setError(null);
        setIsConnected(true);
      } catch (err) {
        setError(err);
      }
    };

    const onServerError = (e) => {
      if (closed) return;
      try {
        const parsed = JSON.parse(e.data);
        setError(new Error(parsed?.message || "Server error"));
      } catch {
        setError(new Error("Server error"));
      }
    };

    const onError = () => {
      if (closed) return;
      setIsConnected(false);
    };

    es.addEventListener("overview", onOverview);
    es.addEventListener("server-error", onServerError);
    es.addEventListener("error", onError);

    return () => {
      closed = true;
      es.close();
    };
  }, [enabled]);

  return { data, isConnected, error };
}

