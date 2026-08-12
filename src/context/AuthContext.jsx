import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

function persistSession({ user, accessToken, refreshToken }) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/api/auth/me')
      .then((res) => {
        setUser(res.data.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
      })
      .catch(() => {
        localStorage.clear();
        setUser(null);
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
        return data.data;
      },
      async verifyEmail(email, code) {
        const { data } = await api.post('/api/auth/verify-email', { email, code });
        persistSession(data.data);
        setUser(data.data.user);
        return data.data.user;
      },
      async resendVerification(email) {
        const { data } = await api.post('/api/auth/resend-verification', { email });
        return data.data;
      },
      logout() {
        localStorage.clear();
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
