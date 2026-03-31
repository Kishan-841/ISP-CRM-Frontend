import { io } from 'socket.io-client';

let socket = null;
const socketReadyCallbacks = new Set();

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

export const initSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect any existing stale socket before creating a new one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    if (error.message === 'Token expired' || error.message === 'Invalid token') {
      console.warn('Socket auth failed — clearing token');
      socket.disconnect();
      socket = null;
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    // Transport errors (xhr poll error, websocket error) are handled by auto-reconnection
  });

  // Notify all waiting listeners that socket is ready
  socketReadyCallbacks.forEach(cb => cb(socket));
  socketReadyCallbacks.clear();

  return socket;
};

export const getSocket = () => socket;

// Register a callback for when socket becomes available.
// If socket already exists, calls immediately. Otherwise queues for initSocket.
export const onSocketReady = (callback) => {
  if (socket) {
    callback(socket);
  } else {
    socketReadyCallbacks.add(callback);
  }
  // Return unsubscribe function
  return () => socketReadyCallbacks.delete(callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const isSocketConnected = () => socket?.connected || false;
