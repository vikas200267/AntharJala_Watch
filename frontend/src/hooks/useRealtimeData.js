import { useState, useEffect, useRef, useCallback } from 'react';
import { api, connectSSE } from '../api/apiClient';

/**
 * Hook: useRealtimeData
 * Manages SSE connection + provides live data refresh
 */
export function useRealtimeData() {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef({});

  useEffect(() => {
    const disconnect = connectSSE((event, data) => {
      if (event === 'connected') setConnected(true);
      else if (event === 'disconnected') setConnected(false);

      setLastEvent({ event, data, at: Date.now() });

      // notify registered listeners
      const cbs = listenersRef.current[event];
      if (cbs) cbs.forEach((fn) => fn(data));
    });

    return disconnect;
  }, []);

  const on = useCallback((event, cb) => {
    if (!listenersRef.current[event]) listenersRef.current[event] = [];
    listenersRef.current[event].push(cb);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter((f) => f !== cb);
    };
  }, []);

  return { connected, lastEvent, on };
}

/**
 * Hook: useDashboard
 * Fetches dashboard data and auto-refreshes on new readings
 */
export function useDashboard(realtime) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api.getDashboard();
    if (res) setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.on('newReading', () => refresh());
  }, [realtime, refresh]);

  return { data, loading, refresh };
}

/**
 * Hook: useAlerts
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.getAlerts();
      if (res?.alerts) setAlerts(res.alerts);
      setLoading(false);
    })();
  }, []);

  return { alerts, loading };
}

/**
 * Hook: useAnalytics
 */
export function useAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.getAnalytics();
      if (res) setData(res);
      setLoading(false);
    })();
  }, []);

  return { data, loading };
}

/**
 * Hook: useHeatmap
 */
export function useHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.getHeatmap();
      if (res) setData(res);
      setLoading(false);
    })();
  }, []);

  return { data, loading };
}

/**
 * Hook: useCommunity
 */
export function useCommunity(realtime) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api.getPosts();
    if (res?.posts) setPosts(res.posts);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.on('newPost', (post) => {
      setPosts((prev) => [post, ...prev]);
    });
  }, [realtime]);

  return { posts, loading, refresh };
}
