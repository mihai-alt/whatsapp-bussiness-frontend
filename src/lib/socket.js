import { io } from 'socket.io-client';

let socket;

function resolveSocketUrl() {
  const explicit = String(import.meta.env.VITE_SOCKET_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const api = String(import.meta.env.VITE_API_URL || '').trim();
  if (api) return api.replace(/\/+$/, '');
  return undefined;
}

function authSocket(s) {
  const token = localStorage.getItem('accessToken');
  if (token) {
    s.emit('authenticate', token);
    s.emit('subscribe:workspace');
  }
}

export function getSocket() {
  if (!socket) {
    const url = resolveSocketUrl();
    socket = io(url, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
    socket.on('connect', () => authSocket(socket));
    authSocket(socket);
  } else {
    authSocket(socket);
  }
  return socket;
}

export function reauthSocket() {
  const s = getSocket();
  if (s.connected) authSocket(s);
  else s.connect();
}

export function subscribeWorkspace() {
  const s = getSocket();
  if (s.connected) s.emit('subscribe:workspace');
}
