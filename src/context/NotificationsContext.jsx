import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getSocket, reauthSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext({
  unread: 0,
  items: [],
  loading: false,
  refreshUnread: async () => {},
  refreshItems: async () => {},
  markAllRead: async () => {},
});

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id || null;

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    try {
      const { data } = await api.get('/api/notifications/unread-count');
      setUnread(Number(data?.data?.count || 0));
    } catch {
      /* ignore */
    }
  }, [userId]);

  const refreshItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/api/notifications', { params: { limit: 20 } });
      setItems((data.data || []).slice(0, 20));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    try {
      await api.post('/api/notifications/read-all');
    } catch {
      await refreshUnread();
    }
  }, [userId, refreshUnread]);

  useEffect(() => {
    if (!userId) {
      setUnread(0);
      setItems([]);
      return undefined;
    }
    void refreshUnread();
    void refreshItems();
    reauthSocket();
    const socket = getSocket();
    const onNotif = (n) => {
      setUnread((c) => c + 1);
      setItems((prev) => [n, ...prev.filter((row) => row.id !== n.id)].slice(0, 20));
    };
    socket.on('notification', onNotif);
    return () => socket.off('notification', onNotif);
  }, [userId, refreshUnread, refreshItems]);

  const value = useMemo(
    () => ({ unread, items, loading, refreshUnread, refreshItems, markAllRead }),
    [unread, items, loading, refreshUnread, refreshItems, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
