/**
 * API Client — connects frontend to Express backend
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`API error [${path}]:`, err.message);
    return null;
  }
}

export const api = {
  // Dashboard
  getDashboard: () => request('/api/dashboard'),

  // Readings
  getReadings: () => request('/api/readings'),
  submitReading: (data) => request('/api/readings', { method: 'POST', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: () => request('/api/alerts'),

  // Analytics
  getAnalytics: () => request('/api/analytics'),

  // Heatmap
  getHeatmap: () => request('/api/heatmap'),

  // Community
  getPosts: () => request('/api/community/posts'),
  createPost: (data) => request('/api/community/posts', { method: 'POST', body: JSON.stringify(data) }),

  // AI Chat
  sendAIMessage: (message, model) =>
    request('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, model }) }),

  // Health
  health: () => request('/api/health'),
};

/**
 * SSE Realtime connection
 */
export function connectSSE(onEvent) {
  const url = `${BASE_URL}/api/stream`;
  let es;
  let retryCount = 0;
  const maxRetries = 10;

  function connect() {
    es = new EventSource(url);

    es.onopen = () => {
      retryCount = 0;
      onEvent('connected', { timestamp: Date.now() });
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent('message', data);
      } catch (_) {}
    };

    es.addEventListener('newReading', (e) => {
      try { onEvent('newReading', JSON.parse(e.data)); } catch (_) {}
    });

    es.addEventListener('newPost', (e) => {
      try { onEvent('newPost', JSON.parse(e.data)); } catch (_) {}
    });

    es.addEventListener('heartbeat', (e) => {
      try { onEvent('heartbeat', JSON.parse(e.data)); } catch (_) {}
    });

    es.onerror = () => {
      es.close();
      onEvent('disconnected', {});
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, Math.min(1000 * retryCount, 10000));
      }
    };
  }

  connect();
  return () => { if (es) es.close(); };
}
