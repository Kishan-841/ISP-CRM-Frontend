'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCustomerAuthStore, useCustomerNexusStore } from '@/lib/customerStore';
import CustomerSidebar, { CustomerHeader } from '@/components/CustomerSidebar';
import NexusWidget from '@/components/nexus/NexusWidget';
import { cn } from '@/lib/utils';

export default function CustomerPortalLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initialize } = useCustomerAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Track sidebar collapse state for margin
  useEffect(() => {
    const checkCollapsed = () => {
      const saved = localStorage.getItem('customer_sidebar_collapsed');
      setIsCollapsed(saved === 'true');
    };
    checkCollapsed();
    window.addEventListener('storage', checkCollapsed);
    // Also listen for sidebar toggle
    const interval = setInterval(checkCollapsed, 500);
    return () => {
      window.removeEventListener('storage', checkCollapsed);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/customer-portal/login') {
      router.push('/customer-portal/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Login page gets its own layout (no sidebar)
  if (pathname === '/customer-portal/login') {
    return children;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <CustomerSidebar />
      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "lg:ml-[70px]" : "lg:ml-[250px]"
        )}
      >
        <CustomerHeader />
        <main className="p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
      <NexusWidget useStoreHook={useCustomerNexusStore} />
    </div>
  );
}
