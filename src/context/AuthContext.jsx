import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAuthStorage } from '../lib/api';

const AuthContext = createContext(null);

function sameUser(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.role === b.role &&
    a.name === b.name &&
    a.email === b.email &&
    a.avatar_url === b.avatar_url
  );
}

function persistSession({ user, accessToken, refreshToken }) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('accessToken');
    const cachedUser = localStorage.getItem('user');
    return Boolean(token && !cachedUser);
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/api/auth/me')
      .then((res) => {
        const next = res.data.data.user;
        localStorage.setItem('user', JSON.stringify(next));
        setUser((prev) => (sameUser(prev, next) ? prev : next));
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          clearAuthStorage();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      async login(email, password) {
        const { data } = await api.post('/api/auth/login', { email, password });
        persistSession(data.data);
        setUser(data.data.user);
        return data.data.user;
      },
      async register(payload) {
        const { data } = await api.post('/api/auth/register', payload);
        persistSession(data.data);
        setUser(data.data.user);
        return data.data.user;
      },
      async verifyEmail(email, code) {
        const { data } = await api.post('/api/auth/verify-email', { email, code });
        if (data?.data?.accessToken) {
          persistSession(data.data);
          setUser(data.data.user);
        }
        return data.data?.user;
      },
      async resendVerification(email) {
        const { data } = await api.post('/api/auth/resend-verification', { email });
        return data.data;
      },
      logout() {
        clearAuthStorage();
        setUser(null);
      },
      setUser(next) {
        setUser(next);
        localStorage.setItem('user', JSON.stringify(next));
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
