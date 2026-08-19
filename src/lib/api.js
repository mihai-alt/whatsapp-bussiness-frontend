import axios from 'axios';
import { queryClient } from './queryClient.js';

const API_URL = import.meta.env.VITE_API_URL || '';
const GET_TTL_MS = 45_000;

const getCache = new Map();
const inflight = new Map();
const rawAdapter = axios.defaults.adapter;

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function normalizeParams(params) {
  if (!params || typeof params !== 'object') return '';
  const cleaned = {};
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;
    cleaned[key] = value;
  }
  return JSON.stringify(cleaned);
}

function requestKey(config) {
  const method = String(config.method || 'get').toLowerCase();
  const url = `${config.baseURL || API_URL || ''}${config.url || ''}`;
  return `${method}:${url}:${normalizeParams(config.params)}`;
}

function shouldCacheGet(config) {
  if (String(config.method || 'get').toLowerCase() !== 'get') return false;
  if (config.cache === false) return false;
  if (config.responseType && config.responseType !== 'json') return false;
  const url = String(config.url || '');
  if (url.includes('/notifications') || url.includes('/health')) return false;
  return true;
}

export function clearApiGetCache() {
  getCache.clear();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (!shouldCacheGet(config)) return config;

  const key = requestKey(config);
  const ttl = Number(config.cacheTtl ?? GET_TTL_MS);
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < ttl) {
    config.adapter = async () => ({
      data: structuredClone(hit.data),
      status: 200,
      statusText: 'OK',
      headers: hit.headers || {},
      config,
      request: {},
    });
    return config;
  }

  const adapter = config.adapter || rawAdapter;
  config.adapter = (cfg) => {
    const reqKey = requestKey(cfg);
    const cached = getCache.get(reqKey);
    if (cached && Date.now() - cached.at < ttl) {
      return Promise.resolve({
        data: structuredClone(cached.data),
        status: 200,
        statusText: 'OK',
        headers: cached.headers || {},
        config: cfg,
        request: {},
      });
    }
    if (inflight.has(reqKey)) return inflight.get(reqKey);
    const pending = Promise.resolve(adapter(cfg))
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          getCache.set(reqKey, { data: res.data, at: Date.now(), headers: res.headers });
        }
        return res;
      })
      .finally(() => inflight.delete(reqKey));
    inflight.set(reqKey, pending);
    return pending;
  };
  return config;
});

api.interceptors.response.use(
  (res) => {
    const method = String(res.config?.method || 'get').toLowerCase();
    if (method !== 'get' && res.status >= 200 && res.status < 300) {
      clearApiGetCache();
      queryClient.invalidateQueries().catch(() => {});
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function prefetchGet(url, config = {}) {
  return api.get(url, config).catch(() => {});
}

export function startApiKeepAlive() {
  const base = API_URL || window.location.origin;
  const ping = () => {
    fetch(`${base}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  };
  ping();
  const id = window.setInterval(ping, 4 * 60 * 1000);
  return () => window.clearInterval(id);
}

export function getErrorMessage(err) {
  return err?.response?.data?.error?.message || err.message || 'Something went wrong';
}

export function getErrorCode(err) {
  return err?.response?.data?.error?.code || '';
}
