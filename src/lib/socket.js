import { io } from 'socket.io-client';

let socket;

function authSocket(s) {
  const token = localStorage.getItem('accessToken');
  if (token) s.emit('authenticate', token);
}

export function getSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_SOCKET_URL || undefined;
    socket = io(url, {
      // When URL is empty, Socket.IO uses the current page origin (Vite).
      // Without a backend this simply fails quietly until the API is running.
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => authSocket(socket));
    authSocket(socket);
  } else {
    authSocket(socket);
  }
  return socket;
}

export function reauthSocket() {
  if (socket?.connected) authSocket(socket);
}
