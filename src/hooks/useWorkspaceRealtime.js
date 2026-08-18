import { useEffect, useRef } from 'react';
import { useWorkspaceRealtimeContext } from '../context/WorkspaceRealtimeContext';
import { getSocket } from '../lib/socket';

/**
 * Live-refresh when workspace data changes (via global socket provider).
 * @param {string[]} resources e.g. ['contacts','groups']
 * @param {(payload?: any) => void | Promise<void>} onChange
 * @param {{ debounceMs?: number, enabled?: boolean }} options
 */
export function useWorkspaceRealtime(resources, onChange, options = {}) {
  const { debounceMs = 200, enabled = true } = options;
  const { subscribe } = useWorkspaceRealtimeContext();
  const resourcesKey = Array.isArray(resources) ? resources.slice().sort().join(',') : '';
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !resourcesKey) return undefined;

    const allowed = resourcesKey.split(',').filter(Boolean);

    // Ensure socket is connected even if provider remounted late
    const socket = getSocket();
    socket.emit('subscribe:workspace');

    const schedule = (payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        Promise.resolve(onChangeRef.current?.(payload)).catch(() => {});
      }, debounceMs);
    };

    const unsubscribe = subscribe(allowed, schedule);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe();
    };
  }, [resourcesKey, debounceMs, enabled, subscribe]);
}
