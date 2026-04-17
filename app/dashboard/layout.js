'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useThemeStore, useSidebarStore, useNotificationStore, useNexusStore } from '@/lib/store';
import { initSocket, disconnectSocket } from '@/lib/socket';
import Sidebar, { Header } from '@/components/Sidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import Breadcrumbs from '@/components/Breadcrumbs';
import NexusWidget from '@/components/nexus/NexusWidget';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize, token } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();
  const { isCollapsed, initialize: initSidebar } = useSidebarStore();

  useEffect(() => {
    initialize();
    initTheme();
    initSidebar();
  }, [initialize, initTheme, initSidebar]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      const socket = initSocket(token);

      // Listen for new notifications
      const handleNotification = (notification) => {
        useNotificationStore.getState().addNotification(notification);

        // Show toast for new notification
        toast.success(notification.title, {
          duration: 4000,
          position: 'top-right'
        });
      };

      socket.on('notification', handleNotification);

      // Fetch initial unread count
      useNotificationStore.getState().fetchUnreadCount();

      return () => {
        socket.off('notification', handleNotification);
        disconnectSocket();
      };
    }
  }, [isAuthenticated, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "lg:ml-[70px]" : "lg:ml-[250px]"
        )}
      >
        <Header />
        <main className="p-3 sm:p-4 lg:p-6">
          <Breadcrumbs />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <NexusWidget useStoreHook={useNexusStore} />
    </div>
  );
}
