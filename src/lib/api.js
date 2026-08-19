import axios, { getAdapter } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const AUTH_KEYS = ['accessToken', 'refreshToken', 'user'];

export function clearAuthStorage() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

function resolveHttpAdapter() {
  const resolve = typeof getAdapter === 'function' ? getAdapter : axios.getAdapter;
  if (typeof resolve !== 'function') return undefined;
  try {
    return resolve('fetch');
  } catch {
    /* Axios 1.x may not expose fetch in every bundle */
  }
  try {
    return resolve('xhr');
  } catch {
    return undefined;
  }
}

const httpAdapter = resolveHttpAdapter();
if (httpAdapter) {
  axios.defaults.adapter = httpAdapter;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  ...(httpAdapter ? { adapter: httpAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const { data } = await axios.post(
      `${API_URL}/api/auth/refresh`,
      { refreshToken },
      httpAdapter ? { adapter: httpAdapter } : undefined
    );
    const accessToken = data?.data?.accessToken;
    if (!accessToken) throw new Error('Refresh failed');
    localStorage.setItem('accessToken', accessToken);
    if (data.data.refreshToken) {
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }
    return accessToken;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        clearAuthStorage();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

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

export function unwrapApiData(res) {
  const body = res?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}
