'use client';

import { useEffect, useRef } from 'react';
import { onSocketReady } from '@/lib/socket';

/**
 * Listens for socket 'sidebar:refresh' events and triggers a data refresh.
 * Debounces rapid-fire events to prevent excessive API calls.
 *
 * @param {Function} refreshFn - Function to call on refresh event
 * @param {Object} options
 * @param {number} options.debounceMs - Debounce delay in ms (default: 1500)
 * @param {boolean} options.enabled - Whether the hook is active (default: true)
 */
export function useSocketRefresh(refreshFn, { debounceMs = 1500, enabled = true } = {}) {
  const timeoutRef = useRef(null);
  const refreshRef = useRef(refreshFn);

  useEffect(() => {
    refreshRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    if (!enabled) return;

    let activeSocket = null;

    const handleRefresh = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        refreshRef.current();
      }, debounceMs);
    };

    // onSocketReady calls immediately if socket exists, or queues for when initSocket runs
    const unsubscribe = onSocketReady((socket) => {
      activeSocket = socket;
      socket.on('sidebar:refresh', handleRefresh);
    });

    return () => {
      unsubscribe();
      if (activeSocket) {
        activeSocket.off('sidebar:refresh', handleRefresh);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, debounceMs]);
}
