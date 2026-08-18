import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSocket, reauthSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

const WorkspaceRealtimeContext = createContext({
  lastEvent: null,
  revision: 0,
  /** @type {(resources: string[], cb: (payload: any) => void) => () => void} */
  subscribe: () => () => {},
});

export function WorkspaceRealtimeProvider({ children }) {
  const { user } = useAuth();
  const [lastEvent, setLastEvent] = useState(null);
  const [revision, setRevision] = useState(0);
  const listenersRef = useRef(new Set());

  useEffect(() => {
    if (!user) return undefined;

    reauthSocket();
    const socket = getSocket();

    const onChanged = (payload) => {
      if (!payload?.resource) return;
      setLastEvent(payload);
      setRevision((n) => n + 1);
      for (const listener of listenersRef.current) {
        try {
          listener(payload);
        } catch {
          /* ignore listener errors */
        }
      }
    };

    const join = () => {
      socket.emit('subscribe:workspace');
      const token = localStorage.getItem('accessToken');
      if (token) socket.emit('authenticate', token);
    };

    join();
    socket.on('connect', join);
    socket.on('workspace:changed', onChanged);

    return () => {
      socket.off('connect', join);
      socket.off('workspace:changed', onChanged);
    };
  }, [user]);

  const subscribe = useCallback((resources, cb) => {
    const allowed = new Set((resources || []).filter(Boolean));
    const wrapped = (payload) => {
      if (!payload?.resource) return;
      if (allowed.size && !allowed.has(payload.resource)) return;
      cb(payload);
    };
    listenersRef.current.add(wrapped);
    return () => {
      listenersRef.current.delete(wrapped);
    };
  }, []);

  const value = useMemo(
    () => ({ lastEvent, revision, subscribe }),
    [lastEvent, revision, subscribe]
  );

  return (
    <WorkspaceRealtimeContext.Provider value={value}>{children}</WorkspaceRealtimeContext.Provider>
  );
}

export function useWorkspaceRealtimeContext() {
  return useContext(WorkspaceRealtimeContext);
}
